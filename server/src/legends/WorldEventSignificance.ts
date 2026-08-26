import { existsSync, readFileSync } from "node:fs";
import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";

export type LegendaryWorldEventType =
  | "combat_result"
  | "market_crash"
  | "governance_change"
  | "territory_capture"
  | "major_resource_collapse"
  | "npc_memory_milestone";

export interface LegendaryWorldEvent {
  readonly eventId: string;
  readonly type: LegendaryWorldEventType;
  readonly tick: number;
  readonly chunkKey?: string;
  readonly actorIds?: readonly string[];
  readonly targetIds?: readonly string[];
  readonly magnitudeKappa?: number;
  readonly sourceHash: string;
}

export interface SignificanceRule {
  readonly eventType: LegendaryWorldEventType;
  readonly baseKappa: number;
  readonly magnitudeWeightKappa: number;
  readonly participantWeightKappa: number;
  readonly thresholdKappa: number;
}

export interface SignificanceRulesContent {
  readonly schemaVersion: 1;
  readonly rules: readonly SignificanceRule[];
}

export interface WorldEventSignificanceResult {
  readonly eventId: string;
  readonly eventType: LegendaryWorldEventType;
  readonly scoreKappa: number;
  readonly thresholdKappa: number;
  readonly qualifies: boolean;
  readonly scoreHash: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function clampKappa(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(value)));
}

function normalizeRule(value: unknown): SignificanceRule | null {
  const record = asRecord(value);
  if (!record) return null;
  const eventType = record.eventType;
  if (typeof eventType !== "string") return null;
  if (!["combat_result", "market_crash", "governance_change", "territory_capture", "major_resource_collapse", "npc_memory_milestone"].includes(eventType)) return null;
  return Object.freeze({
    eventType: eventType as LegendaryWorldEventType,
    baseKappa: clampKappa(Number(record.baseKappa)),
    magnitudeWeightKappa: clampKappa(Number(record.magnitudeWeightKappa)),
    participantWeightKappa: clampKappa(Number(record.participantWeightKappa)),
    thresholdKappa: clampKappa(Number(record.thresholdKappa)),
  });
}

export function loadSignificanceRules(): SignificanceRulesContent {
  const filePath = resolveContentFile("legends/significance-rules.json");
  if (!existsSync(filePath)) return Object.freeze({ schemaVersion: 1, rules: Object.freeze([]) });
  const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
  const root = asRecord(parsed);
  const rawRules = Array.isArray(root?.rules) ? root.rules : [];
  const rules = rawRules.map(normalizeRule).filter((rule): rule is SignificanceRule => Boolean(rule));
  return Object.freeze({ schemaVersion: 1, rules: Object.freeze(rules.sort((a, b) => a.eventType.localeCompare(b.eventType))) });
}

export function scoreWorldEventSignificance(
  event: LegendaryWorldEvent,
  content: SignificanceRulesContent = loadSignificanceRules(),
): WorldEventSignificanceResult {
  const rule = content.rules.find((candidate) => candidate.eventType === event.type);
  const participants = new Set([...(event.actorIds ?? []), ...(event.targetIds ?? [])]);
  const magnitude = clampKappa(event.magnitudeKappa ?? 0);
  const scoreKappa = rule
    ? clampKappa(rule.baseKappa + Math.trunc((magnitude * rule.magnitudeWeightKappa) / 1000) + participants.size * rule.participantWeightKappa)
    : 0;
  const thresholdKappa = rule?.thresholdKappa ?? 1000;
  const scoreHash = stableHash32([
    "WORLD_EVENT_SIGNIFICANCE_V1",
    event.eventId,
    event.type,
    event.tick,
    event.chunkKey ?? "",
    event.sourceHash,
    scoreKappa,
    thresholdKappa,
  ].join("|")).toString(16);
  return Object.freeze({
    eventId: event.eventId,
    eventType: event.type,
    scoreKappa,
    thresholdKappa,
    qualifies: scoreKappa >= thresholdKappa,
    scoreHash,
  });
}
