import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { npcAuthority, WASD_NPC_MEMORY_RULESET } from "./authority.js";
import { stableCatalogStringify } from "./canonical.js";
import { npcLifeGoals, npcLifePlanSchema } from "./npcLifeProtocol.js";
import { decodeNpcReceipt, NPC_LIFE_RECEIPT_VERSION, npcHash, type NpcLifeSnapshot } from "./npcPersistenceProtocol.js";

export const NPC_MULTI_MEMORY_VERSION = "wasd-npc-multi-memory.v4" as const;
export const NPC_MULTI_MEMORY_LIMITS = Object.freeze({ episodes: 24, facts: 64, competencies: 8, seenReceipts: 64, evidenceReceipts: 160, horizon: 3500, bytes: 262144, replayReceipts: 4096 });
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const revision = z.string().regex(/^[a-f0-9]{40}$/);
const index = z.number().int().min(0).max(2147483647);
const expiry = z.number().int().min(0).max(2147487147);
const authoritySchema = z.object({ rulesetVersion: z.literal(WASD_NPC_MEMORY_RULESET), sourceRevision: revision, sourceSha256: hash }).strict();
const provenanceSchema = z.object({ receiptId: id, receiptSha256: hash, decisionHash: hash, logicalIndex: index, authority: authoritySchema }).strict();
const episodeSchema = z.object({ id: hash, logicalIndex: index, regionId: id, participants: z.array(id).min(1).max(16), outcome: z.literal("goal_selected"), goal: z.enum(npcLifeGoals), source: provenanceSchema, expiresAtIndex: expiry }).strict();
const factSchema = z.object({ id: hash, subjectId: id, predicate: z.enum(["selected_goal", "current_hub"]), value: id, version: z.literal("wasd-npc-fact.v1"), validFromIndex: index, validUntilIndex: expiry, provenance: z.array(provenanceSchema).min(1).max(16), status: z.enum(["active", "expired", "conflicted"]), conflictsWith: z.array(hash).max(NPC_MULTI_MEMORY_LIMITS.facts) }).strict();
const competencySchema = z.object({ id: hash, competencyId: z.enum(["utility_goal_selection", "bounded_goal_planning"]), mode: z.literal("configured"), rulesetVersion: z.literal(WASD_NPC_MEMORY_RULESET), authority: authoritySchema, provenance: z.array(provenanceSchema).min(1).max(16) }).strict();
const seenSchema = z.object({ receiptId: id, receiptSha256: hash, logicalIndex: index }).strict();
const stateSchema = z.object({
  version: z.literal(NPC_MULTI_MEMORY_VERSION), npcId: id, authority: authoritySchema,
  lastResolutionIndex: z.number().int().min(-1).max(2147483647), lastReceiptId: id.nullable(),
  working: z.object({ goal: z.enum(npcLifeGoals).nullable(), plan: npcLifePlanSchema.nullable(),
    // Reservation authority is introduced by the typed action gateway, not inferred from a plan.
    reservations: z.array(z.object({ receiptId: id, targetId: id, expiresAtIndex: expiry }).strict()).max(0),
    confirmedEventIds: z.array(id).max(64),
  }).strict(),
  episodic: z.array(episodeSchema).max(NPC_MULTI_MEMORY_LIMITS.episodes),
  semantic: z.array(factSchema).max(NPC_MULTI_MEMORY_LIMITS.facts),
  procedural: z.array(competencySchema).max(NPC_MULTI_MEMORY_LIMITS.competencies),
  seenReceipts: z.array(seenSchema).max(NPC_MULTI_MEMORY_LIMITS.seenReceipts), memoryHash: hash,
}).strict();
export type NpcMemoryV4 = Readonly<z.infer<typeof stateSchema>>;
export type NpcSemanticFact = Readonly<z.infer<typeof factSchema>>;
export type NpcMemoryProvenance = Readonly<z.infer<typeof provenanceSchema>>;
type Fact = z.infer<typeof factSchema>;
type UnsignedState = Omit<z.infer<typeof stateSchema>, "memoryHash">;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const digest = (value: unknown) => createHash("sha256").update(stableCatalogStringify(value)).digest("hex");
const rawDigest = (value: string) => createHash("sha256").update(value).digest("hex");
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function unsignedFact(fact: Fact) {
  const { id: _id, status: _status, conflictsWith: _conflicts, ...payload } = fact;
  return payload;
}
function classifyFacts(facts: Fact[], logicalIndex: number): Fact[] {
  return facts.map(fact => {
    const conflictsWith = facts.filter(other => other.id !== fact.id && other.subjectId === fact.subjectId &&
      other.predicate === fact.predicate && other.value !== fact.value &&
      Math.max(other.validFromIndex, fact.validFromIndex) < Math.min(other.validUntilIndex, fact.validUntilIndex))
      .map(other => other.id).sort(compare);
    return { ...fact, conflictsWith, status: logicalIndex >= fact.validUntilIndex ? "expired" : conflictsWith.length ? "conflicted" : "active" };
  });
}
function seal(state: UnsignedState): NpcMemoryV4 {
  const result = { ...state, memoryHash: digest(state) };
  if (Buffer.byteLength(stableCatalogStringify(result)) > NPC_MULTI_MEMORY_LIMITS.bytes) throw new Error("NPC_MULTI_MEMORY_BYTE_LIMIT");
  return freeze(result);
}

/** Strict rehydration; no defaults, clock reads, LLM text or implicit repair. */
export function parseNpcMemoryV4(value: unknown): NpcMemoryV4 {
  if (typeof value === "string") {
    if (Buffer.byteLength(value) > NPC_MULTI_MEMORY_LIMITS.bytes) throw new Error("NPC_MULTI_MEMORY_BYTE_LIMIT");
    value = JSON.parse(value);
  }
  const state = stateSchema.parse(value);
  const { memoryHash, ...unsigned } = state;
  if (memoryHash !== digest(unsigned) || Buffer.byteLength(stableCatalogStringify(state)) > NPC_MULTI_MEMORY_LIMITS.bytes) throw new Error("NPC_MULTI_MEMORY_HASH_INVALID");
  if ((state.lastResolutionIndex === -1) !== (state.lastReceiptId === null)) throw new Error("NPC_MULTI_MEMORY_CURSOR_INVALID");
  if (new Set(state.seenReceipts.map(r => r.receiptId)).size !== state.seenReceipts.length ||
      state.seenReceipts.some((r, i) => r.logicalIndex > state.lastResolutionIndex || (i > 0 && state.seenReceipts[i-1]!.logicalIndex <= r.logicalIndex))) throw new Error("NPC_MULTI_MEMORY_RECEIPT_ORDER");
  if (state.lastReceiptId && (state.seenReceipts[0]?.receiptId !== state.lastReceiptId || state.seenReceipts[0]?.logicalIndex !== state.lastResolutionIndex || state.working.confirmedEventIds.length !== 1 || state.working.confirmedEventIds[0] !== state.lastReceiptId)) throw new Error("NPC_MULTI_MEMORY_CURSOR_INVALID");
  if (!state.lastReceiptId && (state.seenReceipts.length || state.episodic.length || state.semantic.length || state.procedural.length || state.working.goal !== null || state.working.plan !== null || state.working.confirmedEventIds.length)) throw new Error("NPC_MULTI_MEMORY_GENESIS_INVALID");
  const receiptIdAt = (logicalIndex: number) => `npc_${npcHash([NPC_LIFE_RECEIPT_VERSION,state.npcId,logicalIndex]).slice(0,56)}`;
  for (const seen of state.seenReceipts) {
    if (seen.receiptId !== receiptIdAt(seen.logicalIndex)) throw new Error("NPC_MULTI_MEMORY_RECEIPT_ID_INVALID");
  }
  const provenances = [...state.episodic.map(e=>e.source),...state.semantic.flatMap(f=>f.provenance),...state.procedural.flatMap(c=>c.provenance)];
  const byReceipt = new Map<string, string>();
  for (const source of provenances) {
    const seen = state.seenReceipts.find(r=>r.receiptId===source.receiptId);
    const previous = byReceipt.get(source.receiptId), canonical = stableCatalogStringify(source);
    if (source.receiptId !== receiptIdAt(source.logicalIndex) || source.logicalIndex > state.lastResolutionIndex ||
        (seen && (seen.logicalIndex !== source.logicalIndex || seen.receiptSha256 !== source.receiptSha256)) ||
        (previous && previous !== canonical)) throw new Error("NPC_MULTI_MEMORY_PROVENANCE_INVALID");
    byReceipt.set(source.receiptId,canonical);
  }
  if (stableCatalogStringify(state.episodic) !== stableCatalogStringify([...state.episodic].sort((a,b)=>b.logicalIndex-a.logicalIndex || compare(a.id,b.id))) ||
      stableCatalogStringify(state.semantic) !== stableCatalogStringify([...state.semantic].sort((a,b)=>b.validFromIndex-a.validFromIndex || compare(a.id,b.id))) ||
      stableCatalogStringify(state.procedural) !== stableCatalogStringify([...state.procedural].sort((a,b)=>compare(a.id,b.id)))) throw new Error("NPC_MULTI_MEMORY_ENTRY_ORDER");
  for (const episode of state.episodic) {
    const { id: entryId, ...payload } = episode;
    if (entryId !== digest(payload) || episode.source.logicalIndex !== episode.logicalIndex || episode.logicalIndex > state.lastResolutionIndex || episode.participants.length !== 1 || episode.participants[0] !== state.npcId || episode.expiresAtIndex !== episode.logicalIndex + NPC_MULTI_MEMORY_LIMITS.horizon || state.lastResolutionIndex >= episode.expiresAtIndex) throw new Error("NPC_MULTI_MEMORY_EPISODE_INVALID");
  }
  for (const fact of state.semantic) {
    if (fact.id !== digest(unsignedFact(fact)) || fact.subjectId !== state.npcId || fact.provenance.length !== 1 || fact.provenance[0]!.logicalIndex !== fact.validFromIndex || fact.validUntilIndex !== fact.validFromIndex + NPC_MULTI_MEMORY_LIMITS.horizon || fact.validFromIndex > state.lastResolutionIndex || (fact.predicate === "selected_goal" && !npcLifeGoals.includes(fact.value as typeof npcLifeGoals[number]))) throw new Error("NPC_MULTI_MEMORY_FACT_INVALID");
  }
  if (stableCatalogStringify(state.semantic) !== stableCatalogStringify(classifyFacts(state.semantic, state.lastResolutionIndex))) throw new Error("NPC_MULTI_MEMORY_CONFLICT_INVALID");
  for (const competency of state.procedural) {
    if (competency.id !== digest([competency.rulesetVersion, competency.competencyId, competency.authority]) || competency.provenance.length !== 1 || competency.provenance[0]!.logicalIndex > state.lastResolutionIndex || stableCatalogStringify(competency.authority) !== stableCatalogStringify(competency.provenance[0]!.authority)) throw new Error("NPC_MULTI_MEMORY_COMPETENCY_INVALID");
  }
  for (const entries of [state.episodic, state.semantic, state.procedural]) {
    if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error("NPC_MULTI_MEMORY_DUPLICATE_ENTRY");
  }
  if (state.lastReceiptId) {
    const latest = state.episodic[0];
    if (!latest || latest.source.receiptId !== state.lastReceiptId || latest.goal !== state.working.goal ||
        stableCatalogStringify(latest.source.authority) !== stableCatalogStringify(state.authority) ||
        !state.semantic.some(f=>f.predicate==="selected_goal" && f.value===latest.goal && f.provenance[0]!.receiptId===state.lastReceiptId) ||
        state.procedural.length !== 2 || new Set(state.procedural.map(c=>c.competencyId)).size !== 2 || !state.working.plan) throw new Error("NPC_MULTI_MEMORY_CURRENT_EVIDENCE_INVALID");
  }
  if (state.working.plan) {
    const plan = state.working.plan;
    if (plan.goal !== state.working.goal || plan.planHash !== digest({goal:plan.goal,opportunityId:plan.opportunityId,steps:plan.steps}) ||
        (plan.status === "blocked" ? plan.opportunityId !== null || plan.steps.length !== 0 : plan.opportunityId === null || plan.steps.length === 0)) throw new Error("NPC_MULTI_MEMORY_PLAN_INVALID");
  }
  return freeze(state);
}

export function createNpcMemoryV4(npcId: string): NpcMemoryV4 {
  id.parse(npcId);
  return seal({ version: NPC_MULTI_MEMORY_VERSION, npcId, authority: npcAuthority(), lastResolutionIndex: -1, lastReceiptId: null,
    working: { goal: null, plan: null, reservations: [], confirmedEventIds: [] }, episodic: [], semantic: [], procedural: [], seenReceipts: [] });
}

export type ConfirmedNpcDecision = Readonly<{ receiptId: string; receiptSha256: string; snapshot: NpcLifeSnapshot; authority: ReturnType<typeof npcAuthority> }>;
const verifiedDecisions = new WeakSet<object>();

/** Gateway-only brand check; a matching JSON shape is never confirmed evidence. */
export function isConfirmedNpcDecision(value: unknown): value is ConfirmedNpcDecision {
  return !!value && typeof value === "object" && verifiedDecisions.has(value as object);
}

/** Called on the actual persisted receipt readback, before a memory commit is permitted. */
export function verifyConfirmedNpcDecision(raw: string, expected: Parameters<typeof decodeNpcReceipt>[1] & { receiptId: string }): ConfirmedNpcDecision {
  const snapshot = decodeNpcReceipt(raw, expected);
  if (!("lifeState" in snapshot) || JSON.parse(raw).version !== NPC_LIFE_RECEIPT_VERSION) throw new Error("NPC_MULTI_MEMORY_V3_RECEIPT_REQUIRED");
  const expectedId = `npc_${npcHash([NPC_LIFE_RECEIPT_VERSION, snapshot.npcId, snapshot.decision.resolutionIndex]).slice(0,56)}`;
  if (expected.receiptId !== expectedId) throw new Error("NPC_MULTI_MEMORY_RECEIPT_ID_INVALID");
  const receipt = freeze({ receiptId: expected.receiptId, receiptSha256: rawDigest(raw), snapshot, authority: npcAuthority() });
  verifiedDecisions.add(receipt);
  return receipt;
}

/** Decision episodes and typed facts only. A selected plan is not an executed action. */
export function commitNpcMemoryV4(currentValue: NpcMemoryV4, receipt: ConfirmedNpcDecision): Readonly<{ status: "committed" | "duplicate" | "stale"; memory: NpcMemoryV4 }> {
  if (!verifiedDecisions.has(receipt)) throw new Error("NPC_MULTI_MEMORY_CONFIRMED_RECEIPT_REQUIRED");
  const current = parseNpcMemoryV4(currentValue), snapshot = receipt.snapshot, tick = snapshot.decision.resolutionIndex;
  if (snapshot.npcId !== current.npcId) throw new Error("NPC_MULTI_MEMORY_FOREIGN_NPC");
  const seen = current.seenReceipts.find(r => r.receiptId === receipt.receiptId);
  if (seen) {
    if (seen.receiptSha256 !== receipt.receiptSha256) throw new Error("NPC_MULTI_MEMORY_RECEIPT_CONFLICT");
    return Object.freeze({ status: "duplicate", memory: current });
  }
  if (tick <= current.lastResolutionIndex) return Object.freeze({ status: "stale", memory: current });
  const source = { receiptId: receipt.receiptId, receiptSha256: receipt.receiptSha256, decisionHash: snapshot.decision.decisionHash, logicalIndex: tick, authority: receipt.authority };
  const episode = { logicalIndex: tick, regionId: snapshot.regionId, participants: [snapshot.npcId], outcome: "goal_selected" as const, goal: snapshot.decision.goal, source, expiresAtIndex: tick + NPC_MULTI_MEMORY_LIMITS.horizon };
  const episodic = [{ ...episode, id: digest(episode) }, ...current.episodic].filter(e => tick < e.expiresAtIndex).sort((a,b) => b.logicalIndex-a.logicalIndex || compare(a.id,b.id)).slice(0,NPC_MULTI_MEMORY_LIMITS.episodes);
  const values: Array<[Fact["predicate"],string]> = [["selected_goal",snapshot.decision.goal]];
  if (snapshot.lifeState.economy) values.push(["current_hub",snapshot.lifeState.economy.currentHubId]);
  const addedFacts = values.map(([predicate,value]) => {
    const payload = { subjectId: snapshot.npcId, predicate, value, version: "wasd-npc-fact.v1" as const, validFromIndex: tick, validUntilIndex: tick + NPC_MULTI_MEMORY_LIMITS.horizon, provenance: [source] };
    return { ...payload, id: digest(payload), status: "active" as const, conflictsWith: [] as string[] };
  });
  // Drop whole old facts at capacity; provenance of every retained fact stays complete.
  const facts = [...current.semantic,...addedFacts].sort((a,b) => b.validFromIndex-a.validFromIndex || compare(a.id,b.id)).slice(0,NPC_MULTI_MEMORY_LIMITS.facts);
  const procedural = (["utility_goal_selection","bounded_goal_planning"] as const).map(competencyId => {
    const existing = current.procedural.find(c => c.competencyId === competencyId && c.authority.sourceSha256 === receipt.authority.sourceSha256);
    return existing ?? { id: digest([WASD_NPC_MEMORY_RULESET, competencyId, receipt.authority]), competencyId, mode: "configured" as const, rulesetVersion: WASD_NPC_MEMORY_RULESET, authority: receipt.authority, provenance: [source] };
  }).sort((a,b) => compare(a.id,b.id));
  const memory = seal({ version: NPC_MULTI_MEMORY_VERSION, npcId: current.npcId, authority: receipt.authority, lastResolutionIndex: tick, lastReceiptId: receipt.receiptId,
    working: { goal: snapshot.decision.goal, plan: snapshot.lifeState.plan as z.infer<typeof npcLifePlanSchema>, reservations: [], confirmedEventIds: [receipt.receiptId] },
    episodic, semantic: classifyFacts(facts,tick), procedural,
    seenReceipts: [{ receiptId: receipt.receiptId, receiptSha256: receipt.receiptSha256, logicalIndex: tick },...current.seenReceipts].slice(0,NPC_MULTI_MEMORY_LIMITS.seenReceipts),
  });
  return Object.freeze({ status: "committed", memory: parseNpcMemoryV4(memory) });
}

export function replayNpcMemoryV4(npcId: string, receipts: readonly ConfirmedNpcDecision[]): NpcMemoryV4 {
  if (receipts.length > NPC_MULTI_MEMORY_LIMITS.replayReceipts) throw new Error("NPC_MULTI_MEMORY_REPLAY_LIMIT");
  let memory = createNpcMemoryV4(npcId);
  for (const receipt of [...receipts].sort((a,b) => a.snapshot.decision.resolutionIndex-b.snapshot.decision.resolutionIndex || compare(a.receiptId,b.receiptId))) memory = commitNpcMemoryV4(memory,receipt).memory;
  return memory;
}

/** Exact bounded database lookup set, including provenance older than the recent delivery window. */
export function npcMemoryReceiptIds(value: NpcMemoryV4): readonly string[] {
  const memory = parseNpcMemoryV4(value);
  return Object.freeze([...new Set([...memory.seenReceipts.map(r=>r.receiptId),...memory.episodic.map(e=>e.source.receiptId),
    ...memory.semantic.flatMap(f=>f.provenance.map(p=>p.receiptId)),...memory.procedural.flatMap(c=>c.provenance.map(p=>p.receiptId))])].sort(compare));
}

/** Recheck every retained assertion against actual source receipt readbacks, without relabelling historical authority. */
export function verifyNpcMemoryEvidence(value: NpcMemoryV4, receipts: readonly ConfirmedNpcDecision[]): NpcMemoryV4 {
  const memory = parseNpcMemoryV4(value), ids = npcMemoryReceiptIds(memory);
  if (receipts.length > NPC_MULTI_MEMORY_LIMITS.evidenceReceipts) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_LIMIT");
  const byId = new Map<string, ConfirmedNpcDecision>();
  for (const receipt of receipts) {
    if (!verifiedDecisions.has(receipt) || receipt.snapshot.npcId !== memory.npcId || byId.has(receipt.receiptId)) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_INVALID");
    byId.set(receipt.receiptId,receipt);
  }
  if (byId.size !== ids.length || ids.some(id=>!byId.has(id))) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_REQUIRED");
  for (const source of [...memory.episodic.map(e=>e.source),...memory.semantic.flatMap(f=>f.provenance),...memory.procedural.flatMap(c=>c.provenance)]) {
    const receipt = byId.get(source.receiptId)!;
    if (receipt.receiptSha256 !== source.receiptSha256 || receipt.snapshot.decision.decisionHash !== source.decisionHash || receipt.snapshot.decision.resolutionIndex !== source.logicalIndex) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_MISMATCH");
  }
  for (const seen of memory.seenReceipts) {
    const receipt = byId.get(seen.receiptId)!;
    if (receipt.receiptSha256 !== seen.receiptSha256 || receipt.snapshot.decision.resolutionIndex !== seen.logicalIndex) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_MISMATCH");
  }
  for (const episode of memory.episodic) {
    const snapshot = byId.get(episode.source.receiptId)!.snapshot;
    if (episode.goal !== snapshot.decision.goal || episode.regionId !== snapshot.regionId) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_MISMATCH");
  }
  for (const fact of memory.semantic) {
    const snapshot = byId.get(fact.provenance[0]!.receiptId)!.snapshot;
    if (fact.value !== (fact.predicate === "selected_goal" ? snapshot.decision.goal : snapshot.lifeState.economy?.currentHubId)) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_MISMATCH");
  }
  if (memory.lastReceiptId) {
    const latest = byId.get(memory.lastReceiptId)!.snapshot;
    if (memory.working.goal !== latest.decision.goal || stableCatalogStringify(memory.working.plan) !== stableCatalogStringify(latest.lifeState.plan)) throw new Error("NPC_MULTI_MEMORY_EVIDENCE_MISMATCH");
  }
  return memory;
}

/** Bounded projection for AX1: no raw memories, source payloads or authoring capability. */
export function projectNpcMemoryV4(value: NpcMemoryV4) {
  const memory = parseNpcMemoryV4(value);
  return freeze({ version: "wasd-npc-memory-public.v4" as const, npcId: memory.npcId, resolutionIndex: memory.lastResolutionIndex,
    goal: memory.working.goal, planStatus: memory.working.plan?.status ?? null, memoryHash: memory.memoryHash, sourceRevision: memory.authority.sourceRevision,
    counts: { working: memory.working.confirmedEventIds.length, episodic: memory.episodic.length, semantic: memory.semantic.length, procedural: memory.procedural.length },
    conflictedFacts: memory.semantic.filter(f => f.conflictsWith.length).length, expiredFacts: memory.semantic.filter(f => f.status === "expired").length });
}
