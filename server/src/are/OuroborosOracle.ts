import { createHash } from "node:crypto";
import type { AREGuardPayload } from "./AREInvariantGuard.js";
import { canonicalize } from "./WorldHashSnapshot.js";
import type { DeterministicTickRecord } from "./DeterministicTickRecorder.js";

export type ProphecyKind = "aggression_spike" | "scarcity_event" | "trade_cluster" | "quiet_cycle";
export type ProphecySeverity = "low" | "medium" | "high";

export interface PatternSignal {
  kind: ProphecyKind;
  sector: number;
  strength: number;
  ticksUntil: number;
  evidence: string[];
}

export interface Prophecy {
  id: string;
  kind: ProphecyKind;
  severity: ProphecySeverity;
  severityScore: number;
  active: boolean;
  sector: number;
  ticksUntil: number;
  confidence: number;
  statement: string;
  worldHash: string | null;
  seed: string;
  evidence: string[];
}

export interface OracleReport {
  ok: boolean;
  generatedAtTick: number | null;
  worldHash: string | null;
  seed: string | null;
  patterns: PatternSignal[];
  prophecies: Prophecy[];
}

function stableHash(input: unknown): string { return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex"); }
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function sectorFromPosition(position: any): number { const x = Number(position?.x ?? 0); const y = Number(position?.y ?? 0); const sx = Math.floor(x / 64); const sy = Math.floor(y / 64); return Math.abs((sx * 31 + sy * 17) % 64); }
function payloadSeed(payload: AREGuardPayload | null | undefined, worldHash: string | null): string { const seed = payload?.deterministicSeed ?? payload?.seed ?? "ARE|seed:missing"; return `${seed}|hash:${worldHash ?? "none"}`; }
function avg(values: number[]): number { if (values.length === 0) return 0; return values.reduce((sum, value) => sum + value, 0) / values.length; }

export class PatternAnalyzer {
  analyze(records: DeterministicTickRecord[]): PatternSignal[] {
    if (records.length < 6) return [];
    const ordered = [...records].sort((a, b) => a.tick - b.tick);
    const window = ordered.slice(-Math.min(240, ordered.length));
    const early = window.slice(0, Math.max(1, Math.floor(window.length / 2)));
    const late = window.slice(Math.floor(window.length / 2));
    const patterns: PatternSignal[] = [];

    const aggressionEarly = avg(early.map((record) => this.aggressionPressure(record)));
    const aggressionLate = avg(late.map((record) => this.aggressionPressure(record)));
    const aggressionDelta = aggressionLate - aggressionEarly;
    if (aggressionLate > 0.18 || aggressionDelta > 0.045) patterns.push({ kind: "aggression_spike", sector: this.dominantSector(late, "npcs"), strength: clamp01(aggressionLate + aggressionDelta * 2), ticksUntil: this.projectTicks(aggressionLate, aggressionDelta, 44), evidence: [`late aggression=${aggressionLate.toFixed(4)}`, `delta=${aggressionDelta.toFixed(4)}`, `samples=${late.length}`] });

    const scarcityEarly = avg(early.map((record) => this.scarcityPressure(record)));
    const scarcityLate = avg(late.map((record) => this.scarcityPressure(record)));
    const scarcityDelta = scarcityLate - scarcityEarly;
    if (scarcityLate > 0.35 || scarcityDelta > 0.08) patterns.push({ kind: "scarcity_event", sector: this.dominantSector(late, "players"), strength: clamp01(scarcityLate + scarcityDelta), ticksUntil: this.projectTicks(scarcityLate, scarcityDelta, 64), evidence: [`scarcity pressure=${scarcityLate.toFixed(4)}`, `loot/player drift=${scarcityDelta.toFixed(4)}`] });

    const tradeEarly = avg(early.map((record) => this.tradeClusterPressure(record)));
    const tradeLate = avg(late.map((record) => this.tradeClusterPressure(record)));
    const tradeDelta = tradeLate - tradeEarly;
    if (tradeLate > 0.22 || tradeDelta > 0.04) patterns.push({ kind: "trade_cluster", sector: this.dominantSector(late, "players"), strength: clamp01(tradeLate + tradeDelta), ticksUntil: this.projectTicks(tradeLate, tradeDelta, 52), evidence: [`trade cluster=${tradeLate.toFixed(4)}`, `cluster delta=${tradeDelta.toFixed(4)}`] });

    if (patterns.length === 0) patterns.push({ kind: "quiet_cycle", sector: this.dominantSector(late, "players"), strength: 0.37, ticksUntil: 100, evidence: ["no threshold breach", `samples=${window.length}`] });
    return patterns.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private aggressionPressure(record: DeterministicTickRecord): number { const npcs = record.worldState.npcs as any[]; const damaged = npcs.filter((npc) => Number(npc?.health ?? 0) < Number(npc?.maxHealth ?? npc?.health ?? 0)).length; const dangerRoles = npcs.filter((npc) => /raider|skirmisher|war|guard|picket/i.test(String(npc?.id ?? npc?.role ?? npc?.name ?? ""))).length; return clamp01((damaged * 0.08 + dangerRoles * 0.035) / Math.max(1, npcs.length / 8)); }
  private scarcityPressure(record: DeterministicTickRecord): number { const players = record.worldState.players.length; const loot = record.worldState.loot.length; const npcCount = record.worldState.npcs.length; const demand = players + Math.ceil(npcCount / 8); return clamp01((demand - loot) / Math.max(1, demand + 4)); }
  private tradeClusterPressure(record: DeterministicTickRecord): number { const players = record.worldState.players as any[]; if (players.length < 2) return 0; const sectors = new Map<number, number>(); for (const player of players) { const sector = sectorFromPosition(player?.position); sectors.set(sector, (sectors.get(sector) ?? 0) + 1); } const maxCluster = Math.max(...sectors.values()); return clamp01(maxCluster / Math.max(1, players.length)); }
  private dominantSector(records: DeterministicTickRecord[], source: "players" | "npcs"): number { const sectors = new Map<number, number>(); for (const record of records) { const items = source === "players" ? record.worldState.players : record.worldState.npcs; for (const item of items as any[]) { const sector = sectorFromPosition(item?.position); sectors.set(sector, (sectors.get(sector) ?? 0) + 1); } } return [...sectors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0; }
  private projectTicks(level: number, delta: number, base: number): number { const acceleration = Math.max(0.01, Math.abs(delta)); const pressure = Math.max(0.01, level); return Math.max(10, Math.min(160, Math.round(base / (pressure + acceleration)))); }
}

export class OuroborosOracleEngine {
  private readonly analyzer = new PatternAnalyzer();
  generate(records: DeterministicTickRecord[]): OracleReport { const ordered = [...records].sort((a, b) => a.tick - b.tick); const latest = ordered.at(-1) ?? null; const seed = payloadSeed(latest?.payload, latest?.worldHash ?? null); const patterns = this.analyzer.analyze(ordered); const prophecies = patterns.map((pattern, index) => this.toProphecy(pattern, latest, seed, index)); return { ok: true, generatedAtTick: latest?.tick ?? null, worldHash: latest?.worldHash ?? null, seed, patterns, prophecies }; }

  private toProphecy(pattern: PatternSignal, latest: DeterministicTickRecord | null, seed: string, index: number): Prophecy {
    const worldHash = latest?.worldHash ?? null;
    const id = stableHash({ oracle: "ouroboros", index, pattern, worldHash, seed }).slice(0, 16);
    const confidence = clamp01(pattern.strength * 0.72 + (latest?.worldHash ? 0.18 : 0.06));
    const severityScore = confidence;
    const severity: ProphecySeverity = severityScore > 0.72 ? "high" : severityScore > 0.49 ? "medium" : "low";
    return { id, kind: pattern.kind, severity, severityScore, active: pattern.kind !== "quiet_cycle" && confidence >= 0.34, sector: pattern.sector, ticksUntil: pattern.ticksUntil, confidence, statement: this.statement(pattern), worldHash, seed, evidence: pattern.evidence };
  }

  private statement(pattern: PatternSignal): string { if (pattern.kind === "aggression_spike") return `In ${pattern.ticksUntil} ticks droht ein Aggressions-Spike in Sektor ${pattern.sector}.`; if (pattern.kind === "scarcity_event") return `In ${pattern.ticksUntil} ticks droht ein Scarcity-Event in Sektor ${pattern.sector}.`; if (pattern.kind === "trade_cluster") return `In ${pattern.ticksUntil} ticks formt sich ein Handels-Cluster in Sektor ${pattern.sector}.`; return `Die nächsten ${pattern.ticksUntil} ticks bleiben im ruhigen ARE-Zyklus.`; }
}

export const ouroborosOracleEngine = new OuroborosOracleEngine();
