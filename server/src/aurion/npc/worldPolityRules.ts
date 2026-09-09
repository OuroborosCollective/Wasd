// WASD-owned legacy world/polity rules. Keep existing hashes stable.
import { createHash } from "node:crypto";
import type { NpcNeedKey } from "./npcNeeds.js";

export const AURION_WASD_RULESET_VERSION = "aurion-wasd-rules-v1";
export const AURION_WASD_CONTENT_VERSION = "aurion-wasd-content-v1";

export const worldSignalKinds = ["weather", "ecology", "hazard", "resonance", "economy", "politics", "war", "player_event"] as const;
export type WorldSignalKind = (typeof worldSignalKinds)[number];

export type WorldSignal = {
  id: string;
  kind: WorldSignalKind;
  regionId: string;
  magnitude: number;
  sourceReceiptId: string;
  resolutionIndex: number;
};

export type WorldReaction = {
  id: string;
  regionId: string;
  ruleSetVersion: string;
  contentVersion: string;
  resolutionIndex: number;
  signalIds: readonly string[];
  weatherTone: "clear" | "rain" | "storm" | "ashfall";
  threatDelta: number;
  resourceDelta: number;
  npcNeedDeltas: Readonly<Record<NpcNeedKey, number>>;
  dialogueTone: "calm" | "guarded" | "urgent";
  deterministicHash: string;
};

export const polityGovernmentTypes = ["monarchy", "council", "theocracy", "trade_republic", "warband"] as const;
export type PolityGovernmentType = (typeof polityGovernmentTypes)[number];
export const diplomacyTypes = ["alliance", "trade", "non_aggression", "tribute", "sanction"] as const;
export type DiplomacyType = (typeof diplomacyTypes)[number];

export type PolityState = {
  polityId: string;
  governmentType: PolityGovernmentType;
  territoryIds: readonly string[];
  stability: number;
  activeDiplomacy: readonly DiplomacyType[];
  warPressure: number;
  reactionHash: string;
};

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 10_000) / 10_000));
}

function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, Math.round(value * 10_000) / 10_000));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalHash(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f"), "utf8").digest("hex");
}

function canonicalSignalOrder(left: WorldSignal, right: WorldSignal): number {
  return left.resolutionIndex - right.resolutionIndex
    || compareText(left.regionId, right.regionId)
    || compareText(left.kind, right.kind)
    || compareText(left.id, right.id);
}

export function buildWorldSeedDigest(input: { worldSeed: string; regionId: string; resolutionIndex: number }): string {
  if (!input.worldSeed || !input.regionId || !Number.isSafeInteger(input.resolutionIndex) || input.resolutionIndex < 0) {
    throw new Error("World seed inputs must be explicit and non-negative");
  }
  return canonicalHash([AURION_WASD_RULESET_VERSION, AURION_WASD_CONTENT_VERSION, input.worldSeed, input.regionId, String(input.resolutionIndex)]);
}

/** Resolves bounded visual and gameplay read-model effects from already-confirmed signals. */
export function resolveWorldReaction(input: {
  worldSeed: string;
  regionId: string;
  resolutionIndex: number;
  signals: readonly WorldSignal[];
}): WorldReaction {
  const ordered = input.signals
    .filter(signal => signal.regionId === input.regionId && signal.resolutionIndex <= input.resolutionIndex)
    .slice()
    .sort(canonicalSignalOrder);
  const totals: Record<WorldSignalKind, number> = {
    weather: 0,
    ecology: 0,
    hazard: 0,
    resonance: 0,
    economy: 0,
    politics: 0,
    war: 0,
    player_event: 0,
  };
  ordered.forEach(signal => {
    totals[signal.kind] += clampSigned(signal.magnitude);
  });
  const weatherTone: WorldReaction["weatherTone"] = totals.war > 0.6 || totals.hazard > 0.8
    ? "ashfall"
    : totals.weather > 0.55
      ? "storm"
      : totals.weather > 0.15
        ? "rain"
        : "clear";
  const threatDelta = clampSigned(totals.hazard * 0.65 + totals.war * 0.55 - totals.resonance * 0.15);
  const resourceDelta = clampSigned(totals.ecology * 0.55 + totals.economy * 0.3 - totals.hazard * 0.25 - totals.war * 0.2);
  const npcNeedDeltas: Record<NpcNeedKey, number> = {
    safety: clampSigned(-threatDelta * 0.4),
    resources: clampSigned(resourceDelta * 0.3),
    belonging: clampSigned(-(totals.war * 0.16) + totals.player_event * 0.08),
    status: clampSigned(totals.politics * 0.15 + totals.resonance * 0.08),
    wealth: clampSigned(resourceDelta * 0.25 + totals.economy * 0.2),
    power: clampSigned(totals.politics * 0.2 + totals.war * 0.1),
  };
  const dialogueTone: WorldReaction["dialogueTone"] = threatDelta > 0.55 ? "urgent" : threatDelta > 0.2 || totals.politics > 0.3 ? "guarded" : "calm";
  const seedDigest = buildWorldSeedDigest(input);
  const signalIds = ordered.map(signal => signal.id);
  const deterministicHash = canonicalHash([
    seedDigest,
    ...signalIds,
    weatherTone,
    String(threatDelta),
    String(resourceDelta),
    dialogueTone,
  ]);
  return {
    id: `wr_${deterministicHash.slice(0, 24)}`,
    regionId: input.regionId,
    ruleSetVersion: AURION_WASD_RULESET_VERSION,
    contentVersion: AURION_WASD_CONTENT_VERSION,
    resolutionIndex: input.resolutionIndex,
    signalIds,
    weatherTone,
    threatDelta,
    resourceDelta,
    npcNeedDeltas,
    dialogueTone,
    deterministicHash,
  };
}

export function resolvePolityState(input: {
  polityId: string;
  governmentType: PolityGovernmentType;
  territoryIds: readonly string[];
  stability: number;
  activeDiplomacy: readonly DiplomacyType[];
  warSignals: readonly WorldSignal[];
}): PolityState {
  const territoryIds = input.territoryIds.slice().sort(compareText);
  const activeDiplomacy = input.activeDiplomacy.slice().sort(compareText);
  const warPressure = clampUnit(input.warSignals.filter(signal => signal.kind === "war" || signal.kind === "politics").reduce((total, signal) => total + Math.max(0, signal.magnitude), 0) / 4);
  const stability = clampUnit(input.stability - warPressure * 0.2 + (activeDiplomacy.includes("alliance") ? 0.05 : 0) - (activeDiplomacy.includes("sanction") ? 0.05 : 0));
  const reactionHash = canonicalHash([input.polityId, input.governmentType, ...territoryIds, ...activeDiplomacy, String(stability), String(warPressure)]);
  return { polityId: input.polityId, governmentType: input.governmentType, territoryIds, stability, activeDiplomacy, warPressure, reactionHash };
}
