import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { scoreWorldEventSignificance, type LegendaryWorldEvent, type SignificanceRulesContent } from "./WorldEventSignificance.js";

export interface LegendCandidate {
  readonly candidateId: string;
  readonly eventId: string;
  readonly eventType: LegendaryWorldEvent["type"];
  readonly tick: number;
  readonly significanceKappa: number;
  readonly sourceHash: string;
  readonly origin: "world_event";
  readonly textSideChannelOnly: true;
}

export interface LegendRecord extends LegendCandidate {
  readonly recordHash: string;
  readonly stableSortKey: string;
}

export function createLegendCandidateFromWorldEvent(
  event: LegendaryWorldEvent,
  rules?: SignificanceRulesContent,
): LegendCandidate | null {
  const significance = scoreWorldEventSignificance(event, rules);
  if (!significance.qualifies) return null;
  const candidateId = `legend_${stableHash32([
    "LEGEND_CANDIDATE_V1",
    event.eventId,
    event.type,
    event.tick,
    event.sourceHash,
    significance.scoreKappa,
  ].join("|")).toString(16)}`;
  return Object.freeze({
    candidateId,
    eventId: event.eventId,
    eventType: event.type,
    tick: event.tick,
    significanceKappa: significance.scoreKappa,
    sourceHash: event.sourceHash,
    origin: "world_event",
    textSideChannelOnly: true,
  });
}

export function createLegendRecord(candidate: LegendCandidate): LegendRecord {
  const stableSortKey = [
    String(1000 - candidate.significanceKappa).padStart(4, "0"),
    String(candidate.tick).padStart(12, "0"),
    candidate.eventId,
  ].join(":");
  const recordHash = stableHash32([
    "LEGEND_RECORD_V1",
    candidate.candidateId,
    candidate.eventId,
    candidate.eventType,
    candidate.tick,
    candidate.significanceKappa,
    candidate.sourceHash,
  ].join("|")).toString(16);
  return Object.freeze({ ...candidate, stableSortKey, recordHash });
}

export function sortLegendRecords(records: readonly LegendRecord[]): readonly LegendRecord[] {
  return Object.freeze([...records].sort((a, b) =>
    b.significanceKappa - a.significanceKappa ||
    a.tick - b.tick ||
    a.eventId.localeCompare(b.eventId)
  ));
}
