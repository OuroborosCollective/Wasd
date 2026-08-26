import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";

export type NPCMemoryExchangeStatus = "ready" | "unknown" | "blocked";

export interface NPCMemoryExchangeEntry {
  id: string;
  sourceNpcId: string;
  targetNpcId: string;
  tick: number;
  sequence: number;
  relevancePerMille: number;
  chunkKey: string;
  kappa1000?: number;
  source: "episodic" | "semantic" | "relation" | "runtime";
  status: NPCMemoryExchangeStatus;
  factHash: string;
  payload: Record<string, string | number | boolean>;
}

export interface NPCMemoryExchangeBatch {
  tick: number;
  chunkKey: string;
  entries: NPCMemoryExchangeEntry[];
  batchHash: string;
  sideChannelOnly: true;
}

function stableStringCompare(a: string, b: string): number {
  const ah = stableHash32(a);
  const bh = stableHash32(b);
  if (ah !== bh) return ah - bh;
  return a < b ? -1 : a > b ? 1 : 0;
}

function stablePayloadString(payload: Record<string, string | number | boolean>): string {
  return Object.entries(payload)
    .sort(([a], [b]) => stableStringCompare(a, b))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join("|");
}

export function createNPCMemoryExchangeEntry(params: Omit<NPCMemoryExchangeEntry, "id" | "factHash">): NPCMemoryExchangeEntry {
  const factHash = stableHash32([
    params.sourceNpcId,
    params.targetNpcId,
    params.tick,
    params.sequence,
    params.chunkKey,
    params.kappa1000 ?? "kappa1000:unknown",
    params.relevancePerMille,
    params.source,
    params.status,
    stablePayloadString(params.payload),
  ].join("||")).toString(16).padStart(8, "0");

  return {
    ...params,
    id: `npc_mem_${factHash}`,
    factHash,
  };
}

export function createNPCMemoryExchangeBatch(
  tick: number,
  chunkKey: string,
  entries: NPCMemoryExchangeEntry[]
): NPCMemoryExchangeBatch {
  const ordered = [...entries].sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return stableStringCompare(a.id, b.id);
  });
  const batchHash = stableHash32(ordered.map((entry) => entry.factHash).join("|"))
    .toString(16)
    .padStart(8, "0");

  return {
    tick,
    chunkKey,
    entries: ordered,
    batchHash,
    sideChannelOnly: true,
  };
}
