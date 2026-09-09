// WASD-owned compatibility rules; existing Aurion v2/v3 identities are preserved.
import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { stableCatalogStringify } from "./canonical.js";
import { decideNpcGoal, npcNeedKeys, type NpcNeedState } from "./npcNeeds.js";
import {
  NPC_LIFE_MAX_OPPORTUNITIES,
  NPC_LIFE_MAX_RELATIONSHIPS,
  npcEconomyLifeStateSchema,
  npcLifeDecisionHash,
  npcLifeGoals,
  npcLifeOpportunitySchema,
  npcRelationshipEventSchema,
  parseNpcLifeState,
  parseNpcEconomyLifeState,
  parseNpcLifeOpportunity,
  parseNpcRelationshipEvent,
  resolveNpcLife,
  type NpcEconomyLifeState,
  type NpcLifeDecision,
  type NpcLifeOpportunity,
  type NpcLifeState,
  type NpcRelationshipEvent,
} from "./npcLifeProtocol.js";

export const NPC_MEMORY_VERSION = "aurion-npc-memory.v2" as const;
export const NPC_RECEIPT_VERSION = "aurion-npc-decision.v2" as const;
export const NPC_LIFE_RECEIPT_VERSION = "aurion-npc-decision.v3" as const;
export const NPC_MEMORY_CAPACITY = 24;
export const NPC_MEMORY_AGE_TICKS = 3500;
const index = z.number().int().min(0).max(2147483647);
const id = z.string().min(1).max(96).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const observations = z.array(z.string().min(1).max(120)).max(128);
const memoryText = z.string().min(1).max(280);
const hash64 = z.string().regex(/^[a-f0-9]{64}$/);
export const npcNeedsSchema = z.object({ safety: z.number().finite().min(0).max(1), resources: z.number().finite().min(0).max(1), belonging: z.number().finite().min(0).max(1), status: z.number().finite().min(0).max(1), wealth: z.number().finite().min(0).max(1), power: z.number().finite().min(0).max(1) }).strict();

export type NpcRequest = Readonly<{
  npcId: string;
  regionId: string;
  resolutionIndex: number;
  needEvents: readonly Readonly<{ id: string; need: (typeof npcNeedKeys)[number]; delta: number; sourceReceiptId: string; resolutionIndex: number }>[];
  observationIds: readonly string[];
  memory: readonly string[];
  languageProfileId?: string;
  roleId?: string;
  relationshipEvents?: readonly NpcRelationshipEvent[];
  opportunities?: readonly NpcLifeOpportunity[];
  economy?: NpcEconomyLifeState;
}>;

export const npcRequestSchema = z.object({
  npcId: id, regionId: id, resolutionIndex: index,
  needEvents: z.array(z.object({ id, need: z.enum(npcNeedKeys), delta: z.number().finite().min(-1).max(1), sourceReceiptId: z.string().min(3).max(128), resolutionIndex: index }).strict()).max(128),
  observationIds: observations, memory: z.array(memoryText).max(NPC_MEMORY_CAPACITY),
  languageProfileId: id.default("aurion-common-v1"),
  roleId: id.default("resident"),
  relationshipEvents: z.array(npcRelationshipEventSchema).max(NPC_LIFE_MAX_RELATIONSHIPS).default([]),
  opportunities: z.array(npcLifeOpportunitySchema).max(NPC_LIFE_MAX_OPPORTUNITIES).default([]),
  economy: npcEconomyLifeStateSchema.optional(),
}).strict();

export function npcHash(value: unknown): string { return createHash("sha256").update(stableCatalogStringify(value)).digest("hex"); }

export function normalizeNpcRequest(input: unknown) {
  const result = npcRequestSchema.parse(input);
  if (new Set(result.needEvents.map(e => e.id)).size !== result.needEvents.length || new Set(result.observationIds).size !== result.observationIds.length || new Set(result.relationshipEvents.map(e => e.id)).size !== result.relationshipEvents.length || new Set(result.opportunities.map(e => e.id)).size !== result.opportunities.length) throw new Error("NPC_DUPLICATE_EVIDENCE");
  if (result.needEvents.some(e => e.resolutionIndex !== result.resolutionIndex) || result.relationshipEvents.some(e => e.resolutionIndex !== result.resolutionIndex) || result.opportunities.some(e => e.resolutionIndex !== result.resolutionIndex)) throw new Error("NPC_EVENT_RESOLUTION_MISMATCH");
  if (result.relationshipEvents.some(e => e.targetId === result.npcId)) throw new Error("NPC_SELF_RELATIONSHIP_EVIDENCE");
  const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  result.needEvents.sort((a,b) => cmp(a.sourceReceiptId,b.sourceReceiptId) || cmp(a.id,b.id));
  result.observationIds.sort(cmp);
  result.memory = [...new Set(result.memory)].sort(cmp);
  result.relationshipEvents.sort((a,b) => cmp(a.sourceReceiptId,b.sourceReceiptId) || cmp(a.id,b.id));
  result.opportunities.sort((a,b) => cmp(a.sourceReceiptId,b.sourceReceiptId) || cmp(a.id,b.id));
  const { economy, ...required } = result;
  return { ...required, npcId:result.npcId, regionId:result.regionId, resolutionIndex:result.resolutionIndex,
    languageProfileId:result.languageProfileId, roleId:result.roleId, observationIds:result.observationIds, memory:result.memory,
    needEvents:result.needEvents.map(e=>({id:e.id,need:e.need,delta:e.delta,sourceReceiptId:e.sourceReceiptId,resolutionIndex:e.resolutionIndex})),
    relationshipEvents:result.relationshipEvents.map(parseNpcRelationshipEvent), opportunities:result.opportunities.map(parseNpcLifeOpportunity),
    ...(economy ? {economy:parseNpcEconomyLifeState(economy)} : {}) };
}

export function npcRequestHash(input: ReturnType<typeof normalizeNpcRequest>, version: typeof NPC_RECEIPT_VERSION | typeof NPC_LIFE_RECEIPT_VERSION): string {
  if (version === NPC_RECEIPT_VERSION) {
    return npcHash({ npcId: input.npcId, regionId: input.regionId, resolutionIndex: input.resolutionIndex, needEvents: input.needEvents, observationIds: input.observationIds, memory: input.memory, languageProfileId: input.languageProfileId });
  }
  return npcHash(input);
}

export function parseNpcJson(raw: string): unknown {
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > 65535) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  try { return JSON.parse(raw); } catch { throw new Error("NPC_STORED_CONTENT_CORRUPT"); }
}
const entry = z.object({ id: hash64, text: memoryText, lastSeenIndex: index }).strict();
const memorySchema = z.object({ version: z.literal(NPC_MEMORY_VERSION), entries: z.array(entry).max(NPC_MEMORY_CAPACITY) }).strict();
export type NpcMemory = Readonly<{ version: typeof NPC_MEMORY_VERSION; entries: readonly Readonly<{ id:string; text:string; lastSeenIndex:number }>[] }>;
function freezeMemory(entries: z.infer<typeof entry>[]): NpcMemory {
  return Object.freeze({ version: NPC_MEMORY_VERSION, entries: Object.freeze(entries.map(e => Object.freeze({ id:e.id, text:e.text, lastSeenIndex:e.lastSeenIndex }))) });
}
export function parseNpcMemory(raw: string, lastIndex: number): NpcMemory {
  const value = parseNpcJson(raw);
  // Old valid arrays are preserved and acquire the last confirmed logical index on the next write.
  if (Array.isArray(value)) {
    const texts = z.array(memoryText).max(NPC_MEMORY_CAPACITY).parse(value);
    if (texts.length && lastIndex < 0) throw new Error("NPC_STORED_CONTENT_CORRUPT");
    return freezeMemory([...new Set(texts)].map(text => ({ id: npcHash(text), text, lastSeenIndex: lastIndex })));
  }
  const parsed = memorySchema.parse(value);
  if (new Set(parsed.entries.map(e => e.id)).size !== parsed.entries.length || parsed.entries.some(e => e.id !== npcHash(e.text) || e.lastSeenIndex > lastIndex)) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  return freezeMemory(parsed.entries);
}
export function advanceNpcMemory(current: NpcMemory, texts: readonly string[], resolutionIndex: number): NpcMemory {
  index.parse(resolutionIndex);
  if (current.entries.some(e => e.lastSeenIndex > resolutionIndex)) throw new Error("NPC_MEMORY_CLOCK_REWIND");
  const next = new Map(current.entries.filter(e => resolutionIndex >= e.lastSeenIndex && resolutionIndex - e.lastSeenIndex < NPC_MEMORY_AGE_TICKS).map(e => [e.id, { ...e }]));
  for (const text of z.array(memoryText).max(NPC_MEMORY_CAPACITY).parse(texts)) next.set(npcHash(text), { id: npcHash(text), text, lastSeenIndex: resolutionIndex });
  const entries = [...next.values()].sort((a,b) => b.lastSeenIndex - a.lastSeenIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0,NPC_MEMORY_CAPACITY);
  return freezeMemory(entries);
}

export function parseNpcNeeds(value: unknown): NpcNeedState {
  const n = npcNeedsSchema.parse(value);
  return Object.freeze({ safety:n.safety, resources:n.resources, belonging:n.belonging, status:n.status, wealth:n.wealth, power:n.power });
}

export type LegacyNpcSnapshot = Readonly<{ npcId: string; regionId: string; needs: NpcNeedState; memory: readonly string[]; memoryState: NpcMemory; decision: ReturnType<typeof decideNpcGoal> }>;
export type NpcLifeSnapshot = Readonly<{ npcId: string; regionId: string; needs: NpcNeedState; memory: readonly string[]; memoryState: NpcMemory; lifeState: NpcLifeState; decision: NpcLifeDecision }>;
export type NpcSnapshot = LegacyNpcSnapshot | NpcLifeSnapshot;

/** Legacy constructor is intentionally retained so v2 receipts remain exactly re-verifiable. */
export function createNpcSnapshot(input: { npcId: string; regionId: string; needs: NpcNeedState; memoryState: NpcMemory; observationIds: readonly string[]; resolutionIndex: number }): LegacyNpcSnapshot {
  const needs = parseNpcNeeds(input.needs);
  const decision = decideNpcGoal({ ...input, needs });
  return Object.freeze({ npcId: input.npcId, regionId: input.regionId, needs, memory: Object.freeze(input.memoryState.entries.map(e => e.text)), memoryState: freezeMemory(memorySchema.parse(input.memoryState).entries), decision: Object.freeze({ ...decision, needs, observationIds: Object.freeze([...decision.observationIds]) }) });
}

export function createNpcLifeSnapshot(input: ReturnType<typeof normalizeNpcRequest> & { needs: NpcNeedState; memoryState: NpcMemory; previousLifeState?: NpcLifeState }): NpcLifeSnapshot {
  const needs = parseNpcNeeds(input.needs);
  const life = resolveNpcLife({ npcId: input.npcId, regionId: input.regionId, roleId: input.roleId, resolutionIndex: input.resolutionIndex, needs, memoryEntries: input.memoryState.entries, observationIds: input.observationIds, relationshipEvents: input.relationshipEvents, opportunities: input.opportunities, previous: input.previousLifeState, ...(input.economy ? { economy: input.economy } : {}) });
  const memoryState = freezeMemory(memorySchema.parse(input.memoryState).entries);
  return Object.freeze({ npcId: input.npcId, regionId: input.regionId, needs, memory: Object.freeze(memoryState.entries.map(e => e.text)), memoryState, lifeState: life.state, decision: life.decision });
}

export function encodeNpcReceipt(requestHash: string, snapshot: LegacyNpcSnapshot): string {
  const raw = stableCatalogStringify({ version: NPC_RECEIPT_VERSION, requestHash, snapshot, snapshotHash: npcHash(snapshot) });
  parseNpcJson(raw);
  return raw;
}
export function encodeNpcLifeReceipt(requestHash: string, snapshot: NpcLifeSnapshot): string {
  const raw = stableCatalogStringify({ version: NPC_LIFE_RECEIPT_VERSION, requestHash, snapshot, snapshotHash: npcHash(snapshot) });
  parseNpcJson(raw);
  return raw;
}

export function npcReceiptVersion(raw: string): typeof NPC_RECEIPT_VERSION | typeof NPC_LIFE_RECEIPT_VERSION {
  const parsed = z.object({ version: z.enum([NPC_RECEIPT_VERSION, NPC_LIFE_RECEIPT_VERSION]) }).passthrough().parse(parseNpcJson(raw));
  return parsed.version;
}

const legacyDecisionSchema = z.object({ npcId: id, needs: npcNeedsSchema, goal: z.string(), observationIds: observations, resolutionIndex: index, decisionHash: z.string() }).strict();
const legacyEnvelopeSchema = z.object({ version: z.literal(NPC_RECEIPT_VERSION), requestHash: hash64, snapshotHash: hash64, snapshot: z.object({ npcId: id, regionId: id, needs: npcNeedsSchema, memory: z.array(memoryText).max(NPC_MEMORY_CAPACITY), memoryState: memorySchema, decision: legacyDecisionSchema }).strict() }).strict();
const utilitySchema = z.object({ seek_safety: z.number().int().min(0).max(40_000), gather_resources: z.number().int().min(0).max(40_000), socialize: z.number().int().min(0).max(40_000), gain_reputation: z.number().int().min(0).max(40_000), trade: z.number().int().min(0).max(40_000), expand_influence: z.number().int().min(0).max(40_000) }).strict();
const lifeDecisionSchema = z.object({ npcId: id, needs: npcNeedsSchema, goal: z.enum(npcLifeGoals), longTermGoal: z.enum(npcLifeGoals), observationIds: observations, resolutionIndex: index, utilityBps: utilitySchema, plan: z.unknown(), decisionHash: hash64 }).strict();
const lifeEnvelopeSchema = z.object({ version: z.literal(NPC_LIFE_RECEIPT_VERSION), requestHash: hash64, snapshotHash: hash64, snapshot: z.object({ npcId: id, regionId: id, needs: npcNeedsSchema, memory: z.array(memoryText).max(NPC_MEMORY_CAPACITY), memoryState: memorySchema, lifeState: z.unknown(), decision: lifeDecisionSchema }).strict() }).strict();

export function decodeNpcReceipt(raw: string, expected: { npcId: string; regionId: string; resolutionIndex: number; decisionHash: string; goal: string; requestHash?: string }): NpcSnapshot {
  const value = parseNpcJson(raw);
  if (Array.isArray(value)) throw new Error("NPC_LEGACY_RECEIPT_REQUIRES_RECONCILIATION");
  const version = z.object({ version: z.string() }).passthrough().parse(value).version;
  if (version === NPC_RECEIPT_VERSION) {
    const envelope = legacyEnvelopeSchema.parse(value);
    if (envelope.snapshotHash !== npcHash(envelope.snapshot)) throw new Error("NPC_STORED_CONTENT_CORRUPT");
    if (expected.requestHash && envelope.requestHash !== expected.requestHash) throw new Error("NPC_RESOLUTION_INPUT_CONFLICT");
    const stored = envelope.snapshot;
    const snapshot = createNpcSnapshot({ npcId:stored.npcId, regionId:stored.regionId, needs:parseNpcNeeds(stored.needs), memoryState:freezeMemory(stored.memoryState.entries), observationIds: stored.decision.observationIds, resolutionIndex: stored.decision.resolutionIndex });
    if (snapshot.npcId !== expected.npcId || snapshot.regionId !== expected.regionId || snapshot.decision.resolutionIndex !== expected.resolutionIndex || snapshot.decision.decisionHash !== expected.decisionHash || snapshot.decision.goal !== expected.goal || npcHash(snapshot) !== envelope.snapshotHash) throw new Error("NPC_STORED_CONTENT_CORRUPT");
    return snapshot;
  }
  if (version !== NPC_LIFE_RECEIPT_VERSION) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  const envelope = lifeEnvelopeSchema.parse(value);
  if (envelope.snapshotHash !== npcHash(envelope.snapshot)) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  if (expected.requestHash && envelope.requestHash !== expected.requestHash) throw new Error("NPC_RESOLUTION_INPUT_CONFLICT");
  const stored = envelope.snapshot;
  const memoryState = freezeMemory(memorySchema.parse(stored.memoryState).entries);
  const lifeState = parseNpcLifeState(stored.lifeState);
  const decisionPlan = lifeState.plan;
  const parsedDecision = lifeDecisionSchema.parse(stored.decision);
  const utilityBps = Object.freeze({ seek_safety:parsedDecision.utilityBps.seek_safety, gather_resources:parsedDecision.utilityBps.gather_resources,
    socialize:parsedDecision.utilityBps.socialize, gain_reputation:parsedDecision.utilityBps.gain_reputation,
    trade:parsedDecision.utilityBps.trade, expand_influence:parsedDecision.utilityBps.expand_influence });
  const decision = { ...parsedDecision, npcId:parsedDecision.npcId, resolutionIndex:parsedDecision.resolutionIndex,
    goal:parsedDecision.goal, longTermGoal:parsedDecision.longTermGoal, decisionHash:parsedDecision.decisionHash,
    needs:parseNpcNeeds(parsedDecision.needs), observationIds:parsedDecision.observationIds, utilityBps };
  const decisionHash = npcLifeDecisionHash({ npcId: decision.npcId, resolutionIndex: decision.resolutionIndex, goal: decision.goal, longTermGoal: decision.longTermGoal, needs: decision.needs, observationIds: decision.observationIds, utilityBps: decision.utilityBps, planHash: decisionPlan.planHash, stateHash: lifeState.stateHash });
  if (lifeState.npcId !== stored.npcId || lifeState.lastResolutionIndex !== decision.resolutionIndex || lifeState.currentGoal !== decision.goal || lifeState.longTermGoal !== decision.longTermGoal || npcHash(decision.plan) !== npcHash(decisionPlan) || decisionHash !== decision.decisionHash || stored.memory.length !== memoryState.entries.length || stored.memory.some((text, i) => text !== memoryState.entries[i]!.text)) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  const snapshot: NpcLifeSnapshot = Object.freeze({ npcId: stored.npcId, regionId: stored.regionId, needs: parseNpcNeeds(stored.needs), memory: Object.freeze([...stored.memory]), memoryState, lifeState, decision: Object.freeze({ ...decision, needs: Object.freeze({ ...decision.needs }), observationIds: Object.freeze([...decision.observationIds]), utilityBps: Object.freeze({ ...decision.utilityBps }), plan: decisionPlan }) });
  if (snapshot.npcId !== expected.npcId || snapshot.regionId !== expected.regionId || snapshot.decision.resolutionIndex !== expected.resolutionIndex || snapshot.decision.decisionHash !== expected.decisionHash || snapshot.decision.goal !== expected.goal || npcHash(snapshot) !== envelope.snapshotHash) throw new Error("NPC_STORED_CONTENT_CORRUPT");
  return snapshot;
}
