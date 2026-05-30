import { createHash } from "node:crypto";
import { sovereignMarket } from "../market/SovereignMarket.js";

export type DirectiveKind = "increase_scarcity" | "prioritize_self_healing" | "stabilize_sector" | "boost_trade";
export type VoteChoice = "yes" | "no" | "abstain";
export type DirectiveStatus = "open" | "passed" | "rejected" | "enacted";

export interface WorldDirective {
  id: string;
  title: string;
  kind: DirectiveKind;
  sector: number;
  intensity: number;
  authorId: string;
  authorName: string;
  createdTick: number;
  closesAtTick: number;
  status: DirectiveStatus;
  argument: string;
}

export interface DirectiveVote {
  peerId: string;
  displayName: string;
  choice: VoteChoice;
  weight: number;
  reputation: number;
  creditsAtVote: number;
  tick: number;
  argument: string;
}

export interface DirectiveTally {
  yes: number;
  no: number;
  abstain: number;
  total: number;
  participation: number;
  quorumReached: boolean;
  willOfCollective: "yes" | "no" | "undecided";
}

export interface GovernanceInfluence {
  scarcityBySector: Record<string, number>;
  selfHealingPriorityBySector: Record<string, number>;
  stabilizedSectors: Record<string, number>;
  tradeBoostBySector: Record<string, number>;
}

export interface GovernanceReport {
  ok: boolean;
  tick: number;
  sovereignActive: boolean;
  directives: Array<WorldDirective & { tally: DirectiveTally; votes: DirectiveVote[] }>;
  activeInfluence: GovernanceInfluence;
  emilySummary: string;
}

const DEFAULT_QUORUM_WEIGHT = 10;
const DEFAULT_VOTING_WINDOW_TICKS = 600;

function numericEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function deterministicId(parts: Array<string | number>): string {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 20);
}

function clampSector(value: unknown): number {
  const sector = Math.floor(Number(value));
  if (!Number.isFinite(sector)) return 0;
  return Math.max(0, Math.min(4096, sector));
}

function clampIntensity(value: unknown): number {
  const intensity = Number(value);
  if (!Number.isFinite(intensity)) return 1;
  return Math.max(0.1, Math.min(10, Math.round(intensity * 100) / 100));
}

function sanitizeText(value: unknown, fallback: string, maxLength = 180): string {
  const text = String(value ?? fallback).replace(/[\u0000-\u001f]/g, " ").trim();
  return (text || fallback).slice(0, maxLength);
}

export class SovereignGovernance {
  private readonly directives = new Map<string, WorldDirective>();
  private readonly votes = new Map<string, Map<string, DirectiveVote>>();
  private readonly reputation = new Map<string, number>();
  private sequence = 0;
  private attached = false;
  private influence: GovernanceInfluence = {
    scarcityBySector: {},
    selfHealingPriorityBySector: {},
    stabilizedSectors: {},
    tradeBoostBySector: {},
  };

  attachToTick(tick: any): void {
    if (!tick || this.attached) return;
    this.attached = true;
    const worldState = tick.worldState ?? {};
    worldState.governanceDirectives = this.influence;
    tick.worldState = worldState;
    tick.getGovernanceReport = () => this.getReport(Number(tick.tickCount ?? 0));
    tick.getGovernanceInfluence = () => this.cloneInfluence();
  }

  propose(input: {
    title?: string;
    kind?: DirectiveKind;
    sector?: number;
    intensity?: number;
    authorId?: string;
    authorName?: string;
    argument?: string;
    tick?: number;
    votingWindowTicks?: number;
  }): WorldDirective {
    const tick = Math.max(0, Math.floor(Number(input.tick ?? 0)));
    const authorId = sanitizeText(input.authorId, process.env.ARE_SDK_CLIENT_ID || "local-engine", 96);
    const authorName = sanitizeText(input.authorName, authorId, 96);
    const kind = this.normalizeKind(input.kind);
    const sector = clampSector(input.sector);
    const intensity = clampIntensity(input.intensity);
    const title = sanitizeText(input.title, this.defaultTitle(kind, sector), 120);
    const argument = sanitizeText(input.argument, "Directive submitted to the Collective.", 260);
    this.sequence += 1;
    const id = deterministicId(["directive", this.sequence, tick, authorId, title, kind, sector, intensity]);
    const directive: WorldDirective = {
      id,
      title,
      kind,
      sector,
      intensity,
      authorId,
      authorName,
      createdTick: tick,
      closesAtTick: tick + Math.max(10, Math.floor(Number(input.votingWindowTicks ?? DEFAULT_VOTING_WINDOW_TICKS))),
      status: "open",
      argument,
    };
    this.directives.set(id, directive);
    this.votes.set(id, new Map());
    this.vote({ directiveId: id, peerId: authorId, displayName: authorName, choice: "yes", argument: "Author endorsement.", tick });
    return { ...directive };
  }

  vote(input: { directiveId: string; peerId?: string; displayName?: string; choice?: VoteChoice; argument?: string; tick?: number }): DirectiveVote {
    const directive = this.requireDirective(input.directiveId);
    if (directive.status !== "open") throw new Error(`Directive ${directive.id} is not open.`);
    const tick = Math.max(0, Math.floor(Number(input.tick ?? 0)));
    const peerId = sanitizeText(input.peerId, process.env.ARE_SDK_CLIENT_ID || "local-engine", 96);
    const displayName = sanitizeText(input.displayName, peerId, 96);
    const choice = this.normalizeChoice(input.choice);
    const account = sovereignMarket.resolveAccount(peerId, displayName);
    const reputation = this.resolveReputation(peerId, account.lifetimeHashes, account.lifetimeCreditsCharged);
    const creditWeight = Math.min(1000, Math.max(0, Math.floor(account.credits)));
    const weight = Math.max(1, Math.round((reputation + creditWeight) * 100) / 100);
    const vote: DirectiveVote = {
      peerId,
      displayName,
      choice,
      weight,
      reputation,
      creditsAtVote: account.credits,
      tick,
      argument: sanitizeText(input.argument, "Peer voted.", 220),
    };
    this.votes.get(directive.id)?.set(peerId, vote);
    this.reputation.set(peerId, reputation + 0.25);
    this.evaluateDirective(directive.id, tick);
    return { ...vote };
  }

  enact(directiveId: string, tick = 0): WorldDirective {
    const directive = this.requireDirective(directiveId);
    this.evaluateDirective(directiveId, tick, false);
    if (directive.status !== "passed" && directive.status !== "enacted") throw new Error(`Directive ${directive.id} has not passed.`);
    directive.status = "enacted";
    this.applyInfluence(directive);
    return { ...directive };
  }

  getReport(tick = 0): GovernanceReport {
    const now = Math.max(0, Math.floor(Number(tick)));
    for (const directive of this.directives.values()) this.evaluateDirective(directive.id, now);
    const directives = [...this.directives.values()].sort((a, b) => a.createdTick - b.createdTick || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((directive) => ({ ...directive, tally: this.tally(directive.id), votes: [...(this.votes.get(directive.id)?.values() ?? [])].sort((a, b) => a.tick - b.tick || (a.peerId < b.peerId ? -1 : a.peerId > b.peerId ? 1 : 0)) }));
    const active = directives.filter((directive) => directive.status === "open");
    const enacted = directives.filter((directive) => directive.status === "enacted");
    return {
      ok: true,
      tick: now,
      sovereignActive: active.length > 0,
      directives,
      activeInfluence: this.cloneInfluence(),
      emilySummary: this.summarize(active.length ? active : enacted.slice(-3)),
    };
  }

  private applyInfluence(directive: WorldDirective): void {
    const key = String(directive.sector);
    if (directive.kind === "increase_scarcity") this.influence.scarcityBySector[key] = Math.max(this.influence.scarcityBySector[key] ?? 0, directive.intensity);
    if (directive.kind === "prioritize_self_healing") this.influence.selfHealingPriorityBySector[key] = Math.max(this.influence.selfHealingPriorityBySector[key] ?? 0, directive.intensity);
    if (directive.kind === "stabilize_sector") this.influence.stabilizedSectors[key] = Math.max(this.influence.stabilizedSectors[key] ?? 0, directive.intensity);
    if (directive.kind === "boost_trade") this.influence.tradeBoostBySector[key] = Math.max(this.influence.tradeBoostBySector[key] ?? 0, directive.intensity);
  }

  private evaluateDirective(directiveId: string, tick: number, autoEnact = true): void {
    const directive = this.requireDirective(directiveId);
    if (directive.status !== "open") return;
    const tally = this.tally(directiveId);
    const quorum = numericEnv("ARE_GOVERNANCE_QUORUM_WEIGHT", DEFAULT_QUORUM_WEIGHT);
    if (tally.quorumReached && tally.willOfCollective === "yes") directive.status = "passed";
    else if (tick >= directive.closesAtTick && tally.total >= quorum) directive.status = tally.willOfCollective === "yes" ? "passed" : "rejected";
    if (autoEnact && directive.status === "passed") this.enact(directiveId, tick);
  }

  private tally(directiveId: string): DirectiveTally {
    const entries = [...(this.votes.get(directiveId)?.values() ?? [])];
    const totals = entries.reduce((acc, vote) => {
      acc[vote.choice] += vote.weight;
      acc.total += vote.weight;
      return acc;
    }, { yes: 0, no: 0, abstain: 0, total: 0 } as { yes: number; no: number; abstain: number; total: number });
    const quorum = numericEnv("ARE_GOVERNANCE_QUORUM_WEIGHT", DEFAULT_QUORUM_WEIGHT);
    const willOfCollective = totals.yes > totals.no ? "yes" : totals.no > totals.yes ? "no" : "undecided";
    return {
      yes: Math.round(totals.yes * 100) / 100,
      no: Math.round(totals.no * 100) / 100,
      abstain: Math.round(totals.abstain * 100) / 100,
      total: Math.round(totals.total * 100) / 100,
      participation: Math.round((totals.total / Math.max(1, quorum)) * 1000) / 1000,
      quorumReached: totals.total >= quorum,
      willOfCollective,
    };
  }

  private resolveReputation(peerId: string, lifetimeHashes: number, lifetimeCredits: number): number {
    const stored = this.reputation.get(peerId) ?? 1;
    const earned = Math.min(50, Math.floor(Math.max(0, lifetimeHashes) / 10000) + Math.floor(Math.max(0, lifetimeCredits) / 25));
    return Math.max(stored, 1 + earned);
  }

  private summarize(directives: Array<WorldDirective & { tally?: DirectiveTally; votes?: DirectiveVote[] }>): string {
    if (directives.length === 0) return "Emily: Der Council ist ruhig. Keine aktiven World-Directives.";
    const strongest = directives.map((directive) => ({ directive, tally: this.tally(directive.id) })).sort((a, b) => b.tally.total - a.tally.total || (a.directive.id < b.directive.id ? -1 : a.directive.id > b.directive.id ? 1 : 0))[0];
    return `Emily-Moderatorin: Der Wille des Collective zeigt ${strongest.tally.willOfCollective.toUpperCase()} für „${strongest.directive.title}“. Beteiligung ${strongest.tally.total}/${numericEnv("ARE_GOVERNANCE_QUORUM_WEIGHT", DEFAULT_QUORUM_WEIGHT)} Gewicht. Einflussziel: ${strongest.directive.kind} in Sektor ${strongest.directive.sector}.`;
  }

  private cloneInfluence(): GovernanceInfluence {
    return {
      scarcityBySector: { ...this.influence.scarcityBySector },
      selfHealingPriorityBySector: { ...this.influence.selfHealingPriorityBySector },
      stabilizedSectors: { ...this.influence.stabilizedSectors },
      tradeBoostBySector: { ...this.influence.tradeBoostBySector },
    };
  }

  private normalizeKind(kind: unknown): DirectiveKind {
    const value = String(kind || "");
    if (["increase_scarcity", "prioritize_self_healing", "stabilize_sector", "boost_trade"].includes(value)) return value as DirectiveKind;
    return "prioritize_self_healing";
  }

  private normalizeChoice(choice: unknown): VoteChoice {
    const value = String(choice || "yes");
    if (["yes", "no", "abstain"].includes(value)) return value as VoteChoice;
    return "yes";
  }

  private defaultTitle(kind: DirectiveKind, sector: number): string {
    if (kind === "increase_scarcity") return `Increase scarcity in sector ${sector}`;
    if (kind === "prioritize_self_healing") return `Prioritize self-healing in sector ${sector}`;
    if (kind === "stabilize_sector") return `Stabilize sector ${sector}`;
    return `Boost trade in sector ${sector}`;
  }

  private requireDirective(directiveId: string): WorldDirective {
    const directive = this.directives.get(String(directiveId));
    if (!directive) throw new Error(`Directive ${directiveId} not found.`);
    return directive;
  }
}

export const sovereignGovernance = new SovereignGovernance();
