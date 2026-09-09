// WASD-owned compatibility rules; existing Aurion v2/v3 identities are preserved.
import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { stableCatalogStringify } from "./canonical.js";
import type { NpcGoal, NpcNeedKey, NpcNeedState } from "./npcNeeds.js";

export const NPC_LIFE_VERSION = "aurion-npc-life.v1" as const;
export const NPC_LIFE_MAX_RELATIONSHIPS = 64;
export const NPC_LIFE_MAX_OPPORTUNITIES = 128;
export const NPC_LIFE_MAX_PLAN_STEPS = 6;
export const NPC_LIFE_MEMORY_HORIZON = 3500;

const id = z.string().min(1).max(96).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const index = z.number().int().min(0).max(2147483647);
const bps = z.number().int().min(0).max(10_000);
const signedBps = z.number().int().min(-10_000).max(10_000);
const copper = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const signedCopper = z.number().int().min(-1_000_000_000).max(1_000_000_000);

export const npcLifeGoals = ["seek_safety", "gather_resources", "socialize", "gain_reputation", "trade", "expand_influence"] as const satisfies readonly NpcGoal[];
export const npcLifeOpportunityKinds = ["safe_hub", "resource", "social", "reputation", "market", "influence"] as const;
export type NpcLifeOpportunityKind = (typeof npcLifeOpportunityKinds)[number];
export const npcLifePlanActions = ["travel_to_safety", "recover_safety", "travel_to_resource", "gather_resource", "approach_actor", "socialize", "serve_region", "gain_reputation", "reach_market", "trade", "approach_influence_target", "extend_influence"] as const;
export type NpcLifePlanAction = (typeof npcLifePlanActions)[number];

export type NpcPersonality = Readonly<{
  empathyBps: number;
  courageBps: number;
  curiosityBps: number;
  loyaltyBps: number;
  ambitionBps: number;
  prudenceBps: number;
}>;

export type NpcRelationshipEvent = Readonly<{
  id: string;
  targetId: string;
  trustDeltaBps: number;
  affectionDeltaBps: number;
  fearDeltaBps: number;
  rivalryDeltaBps: number;
  debtDeltaCopper: number;
  sourceReceiptId: string;
  resolutionIndex: number;
}>;

export type NpcRelationship = Readonly<{
  targetId: string;
  trustBps: number;
  affectionBps: number;
  fearBps: number;
  rivalryBps: number;
  debtCopper: number;
  lastResolutionIndex: number;
}>;

export type NpcLifeOpportunity = Readonly<{
  id: string;
  kind: NpcLifeOpportunityKind;
  regionId: string;
  targetId?: string;
  benefitBps: number;
  riskBps: number;
  distanceBps: number;
  sourceReceiptId: string;
  resolutionIndex: number;
}>;

export type NpcEconomyLifeState = Readonly<{
  currentHubId: string;
  wealthCopper: number;
  hungerBps: number;
  fatigueBps: number;
  tradeProwessBps: number;
  harvestYieldBps: number;
}>;

export type NpcLifePlanStep = Readonly<{
  action: NpcLifePlanAction;
  opportunityId: string;
  regionId: string;
  targetId?: string;
}>;

export type NpcLifePlan = Readonly<{
  status: "planned" | "blocked";
  goal: NpcGoal;
  opportunityId: string | null;
  steps: readonly NpcLifePlanStep[];
  planHash: string;
}>;

export type NpcLifeState = Readonly<{
  version: typeof NPC_LIFE_VERSION;
  npcId: string;
  homeRegionId: string;
  roleId: string;
  personality: NpcPersonality;
  relationships: readonly NpcRelationship[];
  currentGoal: NpcGoal;
  currentGoalSinceResolutionIndex: number;
  longTermGoal: NpcGoal;
  longTermGoalSinceResolutionIndex: number;
  plan: NpcLifePlan;
  economy?: NpcEconomyLifeState;
  lastResolutionIndex: number;
  decisionCount: number;
  stateHash: string;
}>;

export type NpcLifeDecision = Readonly<{
  npcId: string;
  goal: NpcGoal;
  longTermGoal: NpcGoal;
  needs: NpcNeedState;
  observationIds: readonly string[];
  resolutionIndex: number;
  utilityBps: Readonly<Record<NpcGoal, number>>;
  plan: NpcLifePlan;
  decisionHash: string;
}>;

const personalitySchema = z.object({ empathyBps: bps, courageBps: bps, curiosityBps: bps, loyaltyBps: bps, ambitionBps: bps, prudenceBps: bps }).strict();
export const npcRelationshipEventSchema = z.object({ id, targetId: id, trustDeltaBps: signedBps.default(0), affectionDeltaBps: signedBps.default(0), fearDeltaBps: signedBps.default(0), rivalryDeltaBps: signedBps.default(0), debtDeltaCopper: signedCopper.default(0), sourceReceiptId: z.string().min(3).max(128), resolutionIndex: index }).strict();
const relationshipSchema = z.object({ targetId: id, trustBps: bps, affectionBps: bps, fearBps: bps, rivalryBps: bps, debtCopper: signedCopper, lastResolutionIndex: index }).strict();
export const npcLifeOpportunitySchema = z.object({ id, kind: z.enum(npcLifeOpportunityKinds), regionId: id, targetId: id.optional(), benefitBps: bps, riskBps: bps, distanceBps: bps, sourceReceiptId: z.string().min(3).max(128), resolutionIndex: index }).strict();
export const npcEconomyLifeStateSchema = z.object({ currentHubId: id, wealthCopper: copper, hungerBps: bps, fatigueBps: bps, tradeProwessBps: z.number().int().min(0).max(30_000), harvestYieldBps: z.number().int().min(0).max(30_000) }).strict();
const planStepSchema = z.object({ action: z.enum(npcLifePlanActions), opportunityId: id, regionId: id, targetId: id.optional() }).strict();
const planSchema = z.object({ status: z.enum(["planned", "blocked"]), goal: z.enum(npcLifeGoals), opportunityId: id.nullable(), steps: z.array(planStepSchema).max(NPC_LIFE_MAX_PLAN_STEPS), planHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export { planSchema as npcLifePlanSchema };
const stateSchema = z.object({ version: z.literal(NPC_LIFE_VERSION), npcId: id, homeRegionId: id, roleId: id, personality: personalitySchema, relationships: z.array(relationshipSchema).max(NPC_LIFE_MAX_RELATIONSHIPS), currentGoal: z.enum(npcLifeGoals), currentGoalSinceResolutionIndex: index, longTermGoal: z.enum(npcLifeGoals), longTermGoalSinceResolutionIndex: index, plan: planSchema, economy: npcEconomyLifeStateSchema.optional(), lastResolutionIndex: index, decisionCount: z.number().int().min(1).max(2147483647), stateHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

const needForGoal: Readonly<Record<NpcGoal, NpcNeedKey>> = Object.freeze({ seek_safety: "safety", gather_resources: "resources", socialize: "belonging", gain_reputation: "status", trade: "wealth", expand_influence: "power" });
const opportunityForGoal: Readonly<Record<NpcGoal, NpcLifeOpportunityKind>> = Object.freeze({ seek_safety: "safe_hub", gather_resources: "resource", socialize: "social", gain_reputation: "reputation", trade: "market", expand_influence: "influence" });

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function clampInt(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(value))); }
function lifeHash(value: unknown): string { return createHash("sha256").update(stableCatalogStringify(value), "utf8").digest("hex"); }
function withoutStateHash(state: Omit<NpcLifeState, "stateHash"> | NpcLifeState) { const { stateHash: _ignored, ...rest } = state as NpcLifeState; return rest; }

// Explicit required fields preserve types under the legacy server's strictNullChecks=false.
// Every value below has already passed its strict runtime schema; the capsule also compiles with strict=true.
export function parseNpcEconomyLifeState(value: unknown): NpcEconomyLifeState {
  const e = npcEconomyLifeStateSchema.parse(value);
  return Object.freeze({ ...e, currentHubId:e.currentHubId, wealthCopper:e.wealthCopper, hungerBps:e.hungerBps, fatigueBps:e.fatigueBps, tradeProwessBps:e.tradeProwessBps, harvestYieldBps:e.harvestYieldBps });
}
export function parseNpcLifeOpportunity(value: unknown): NpcLifeOpportunity {
  const e = npcLifeOpportunitySchema.parse(value);
  return { ...e, id:e.id, kind:e.kind, regionId:e.regionId, benefitBps:e.benefitBps, riskBps:e.riskBps, distanceBps:e.distanceBps, sourceReceiptId:e.sourceReceiptId, resolutionIndex:e.resolutionIndex };
}
export function parseNpcRelationshipEvent(value: unknown): NpcRelationshipEvent {
  const e = npcRelationshipEventSchema.parse(value);
  return { ...e, id:e.id, targetId:e.targetId, trustDeltaBps:e.trustDeltaBps, affectionDeltaBps:e.affectionDeltaBps, fearDeltaBps:e.fearDeltaBps, rivalryDeltaBps:e.rivalryDeltaBps, debtDeltaCopper:e.debtDeltaCopper, sourceReceiptId:e.sourceReceiptId, resolutionIndex:e.resolutionIndex };
}
function freezePlan(plan: z.infer<typeof planSchema>): NpcLifePlan {
  return Object.freeze({ ...plan, status:plan.status, goal:plan.goal, opportunityId:plan.opportunityId, planHash:plan.planHash,
    steps:Object.freeze(plan.steps.map(step => Object.freeze({ ...step, action:step.action, opportunityId:step.opportunityId, regionId:step.regionId }))) });
}
function freezeState(parsed: z.infer<typeof stateSchema>): NpcLifeState {
  const p = parsed.personality;
  const { economy, ...required } = parsed;
  return Object.freeze({ ...required, version:parsed.version, npcId:parsed.npcId, homeRegionId:parsed.homeRegionId, roleId:parsed.roleId,
    currentGoal:parsed.currentGoal, currentGoalSinceResolutionIndex:parsed.currentGoalSinceResolutionIndex, longTermGoal:parsed.longTermGoal,
    longTermGoalSinceResolutionIndex:parsed.longTermGoalSinceResolutionIndex, lastResolutionIndex:parsed.lastResolutionIndex,
    decisionCount:parsed.decisionCount, stateHash:parsed.stateHash,
    personality:Object.freeze({ empathyBps:p.empathyBps, courageBps:p.courageBps, curiosityBps:p.curiosityBps, loyaltyBps:p.loyaltyBps, ambitionBps:p.ambitionBps, prudenceBps:p.prudenceBps }),
    relationships:Object.freeze(parsed.relationships.map(e=>Object.freeze({ targetId:e.targetId, trustBps:e.trustBps, affectionBps:e.affectionBps, fearBps:e.fearBps, rivalryBps:e.rivalryBps, debtCopper:e.debtCopper, lastResolutionIndex:e.lastResolutionIndex }))),
    plan:freezePlan(parsed.plan), ...(economy ? { economy:parseNpcEconomyLifeState(economy) } : {}) });
}

export function parseNpcLifeState(value: unknown): NpcLifeState {
  const parsed = stateSchema.parse(value);
  if (parsed.relationships.some((entry, i) => i > 0 && parsed.relationships[i - 1]!.targetId >= entry.targetId)) throw new Error("NPC_LIFE_RELATIONSHIP_ORDER_INVALID");
  if (parsed.plan.status === "blocked" ? parsed.plan.opportunityId !== null || parsed.plan.steps.length !== 0 : parsed.plan.opportunityId === null || parsed.plan.steps.length === 0) throw new Error("NPC_LIFE_PLAN_INVALID");
  if (parsed.plan.planHash !== lifeHash({ goal: parsed.plan.goal, opportunityId: parsed.plan.opportunityId, steps: parsed.plan.steps })) throw new Error("NPC_LIFE_PLAN_HASH_INVALID");
  if (parsed.stateHash !== lifeHash(withoutStateHash(parsed as NpcLifeState))) throw new Error("NPC_LIFE_STATE_HASH_INVALID");
  return freezeState(parsed);
}

export function deriveNpcPersonality(npcId: string): NpcPersonality {
  id.parse(npcId);
  const bytes = createHash("sha256").update(`${NPC_LIFE_VERSION}\u001f${npcId}`, "utf8").digest();
  const value = (offset: number) => 2_000 + (bytes.readUInt16BE(offset) % 6_001);
  return Object.freeze({ empathyBps: value(0), courageBps: value(2), curiosityBps: value(4), loyaltyBps: value(6), ambitionBps: value(8), prudenceBps: value(10) });
}

function decayToward(value: number, target: number, ticks: number, perTick: number): number {
  if (value === target || ticks <= 0) return value;
  const movement = Math.min(Math.abs(value - target), ticks * perTick);
  return value < target ? value + movement : value - movement;
}

function advanceRelationships(input: { npcId: string; previous?: NpcLifeState; events: readonly NpcRelationshipEvent[]; resolutionIndex: number }): readonly NpcRelationship[] {
  const map = new Map<string, NpcRelationship>();
  for (const previous of input.previous?.relationships ?? []) {
    if (previous.lastResolutionIndex > input.resolutionIndex) throw new Error("NPC_LIFE_RELATIONSHIP_CLOCK_REWIND");
    const elapsed = input.resolutionIndex - previous.lastResolutionIndex;
    map.set(previous.targetId, Object.freeze({ ...previous, trustBps: decayToward(previous.trustBps, 5_000, elapsed, 1), affectionBps: decayToward(previous.affectionBps, 0, elapsed, 1), fearBps: decayToward(previous.fearBps, 0, elapsed, 2), rivalryBps: decayToward(previous.rivalryBps, 0, elapsed, 1), lastResolutionIndex: input.resolutionIndex }));
  }
  const events = input.events.map(event => npcRelationshipEventSchema.parse(event)).slice().sort((a, b) => compareText(a.sourceReceiptId, b.sourceReceiptId) || compareText(a.id, b.id));
  if (events.some(event => event.resolutionIndex !== input.resolutionIndex || event.targetId === input.npcId)) throw new Error("NPC_LIFE_RELATIONSHIP_EVENT_INVALID");
  if (new Set(events.map(event => event.id)).size !== events.length) throw new Error("NPC_LIFE_DUPLICATE_RELATIONSHIP_EVIDENCE");
  for (const event of events) {
    const current = map.get(event.targetId) ?? Object.freeze<NpcRelationship>({ targetId: event.targetId, trustBps: 5_000, affectionBps: 0, fearBps: 0, rivalryBps: 0, debtCopper: 0, lastResolutionIndex: input.resolutionIndex });
    map.set(event.targetId, Object.freeze({ targetId: event.targetId, trustBps: clampInt(current.trustBps + event.trustDeltaBps, 0, 10_000), affectionBps: clampInt(current.affectionBps + event.affectionDeltaBps, 0, 10_000), fearBps: clampInt(current.fearBps + event.fearDeltaBps, 0, 10_000), rivalryBps: clampInt(current.rivalryBps + event.rivalryDeltaBps, 0, 10_000), debtCopper: clampInt(current.debtCopper + event.debtDeltaCopper, -1_000_000_000, 1_000_000_000), lastResolutionIndex: input.resolutionIndex }));
  }
  if (map.size > NPC_LIFE_MAX_RELATIONSHIPS) throw new Error("NPC_LIFE_RELATIONSHIP_CAPACITY_EXCEEDED");
  return Object.freeze([...map.values()].sort((a, b) => compareText(a.targetId, b.targetId)));
}

function memoryUtility(goal: NpcGoal, entries: readonly Readonly<{ text: string; lastSeenIndex: number }>[], resolutionIndex: number): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.lastSeenIndex > resolutionIndex) throw new Error("NPC_LIFE_MEMORY_CLOCK_REWIND");
    const age = resolutionIndex - entry.lastSeenIndex;
    if (age >= NPC_LIFE_MEMORY_HORIZON) continue;
    const salience = Math.max(0, 2_500 - Math.floor(age * 2_500 / NPC_LIFE_MEMORY_HORIZON));
    const text = entry.text.toLowerCase();
    const relevant = goal === "seek_safety" ? /danger:|ambush|hazard|attack/.test(text)
      : goal === "gather_resources" ? /produce:|resource:|gather:/.test(text)
        : goal === "socialize" ? /social:|friend|helped|talk/.test(text)
          : goal === "gain_reputation" ? /reputation:|status:|quest:|patrol/.test(text)
            : goal === "trade" ? /trade:|market:|price:|sell:|buy:/.test(text)
              : /influence:|politics:|leadership:|territory:/.test(text);
    if (relevant) total += salience;
  }
  return Math.min(5_000, total);
}

function relationshipUtility(goal: NpcGoal, relationships: readonly NpcRelationship[]): number {
  if (!relationships.length) return 0;
  let best = 0;
  for (const relationship of relationships) {
    const value = goal === "seek_safety" ? Math.floor((relationship.fearBps + relationship.rivalryBps) / 4)
      : goal === "socialize" ? Math.floor((relationship.affectionBps + (10_000 - relationship.trustBps)) / 5)
        : goal === "gain_reputation" || goal === "expand_influence" ? Math.floor(relationship.rivalryBps / 3)
          : goal === "trade" ? Math.min(2_500, Math.floor(Math.abs(relationship.debtCopper) / 100))
            : 0;
    best = Math.max(best, value);
  }
  return Math.min(5_000, best);
}

function personalityUtility(goal: NpcGoal, personality: NpcPersonality): number {
  const raw = goal === "seek_safety" ? personality.prudenceBps + (10_000 - personality.courageBps)
    : goal === "gather_resources" ? personality.prudenceBps + personality.ambitionBps
      : goal === "socialize" ? personality.empathyBps + personality.loyaltyBps
        : goal === "gain_reputation" ? personality.ambitionBps + personality.loyaltyBps
          : goal === "trade" ? personality.ambitionBps + personality.prudenceBps
            : personality.ambitionBps + (10_000 - personality.empathyBps);
  return Math.floor(raw / 4);
}

function opportunityNet(opportunity: NpcLifeOpportunity): number {
  return clampInt(opportunity.benefitBps - Math.floor(opportunity.riskBps / 2) - Math.floor(opportunity.distanceBps / 4), 0, 10_000);
}

function bestOpportunity(goal: NpcGoal, opportunities: readonly NpcLifeOpportunity[]): NpcLifeOpportunity | undefined {
  return opportunities.filter(value => value.kind === opportunityForGoal[goal]).slice().sort((a, b) => opportunityNet(b) - opportunityNet(a) || compareText(a.id, b.id))[0];
}

function makePlan(goal: NpcGoal, opportunities: readonly NpcLifeOpportunity[]): NpcLifePlan {
  const opportunity = bestOpportunity(goal, opportunities);
  if (!opportunity) {
    const raw = { status: "blocked" as const, goal, opportunityId: null, steps: [] as NpcLifePlanStep[] };
    return Object.freeze({ ...raw, steps: Object.freeze(raw.steps), planHash: lifeHash({ goal, opportunityId: null, steps: raw.steps }) });
  }
  const actionPairs: Readonly<Record<NpcGoal, readonly [NpcLifePlanAction, NpcLifePlanAction]>> = Object.freeze({ seek_safety: ["travel_to_safety", "recover_safety"], gather_resources: ["travel_to_resource", "gather_resource"], socialize: ["approach_actor", "socialize"], gain_reputation: ["serve_region", "gain_reputation"], trade: ["reach_market", "trade"], expand_influence: ["approach_influence_target", "extend_influence"] });
  const steps = actionPairs[goal].map(action => Object.freeze({ action, opportunityId: opportunity.id, regionId: opportunity.regionId, ...(opportunity.targetId ? { targetId: opportunity.targetId } : {}) }));
  return Object.freeze({ status: "planned", goal, opportunityId: opportunity.id, steps: Object.freeze(steps), planHash: lifeHash({ goal, opportunityId: opportunity.id, steps }) });
}

export function npcLifeDecisionHash(input: { npcId: string; resolutionIndex: number; goal: NpcGoal; longTermGoal: NpcGoal; needs: NpcNeedState; observationIds: readonly string[]; utilityBps: Readonly<Record<NpcGoal, number>>; planHash: string; stateHash: string }): string {
  return lifeHash({ version: NPC_LIFE_VERSION, npcId: input.npcId, resolutionIndex: input.resolutionIndex, goal: input.goal, longTermGoal: input.longTermGoal, needs: input.needs, observationIds: [...input.observationIds].sort(compareText), utilityBps: input.utilityBps, planHash: input.planHash, stateHash: input.stateHash });
}

export function resolveNpcLife(input: Readonly<{
  npcId: string;
  regionId: string;
  roleId: string;
  resolutionIndex: number;
  needs: NpcNeedState;
  memoryEntries: readonly Readonly<{ text: string; lastSeenIndex: number }>[];
  observationIds: readonly string[];
  relationshipEvents: readonly NpcRelationshipEvent[];
  opportunities: readonly NpcLifeOpportunity[];
  previous?: NpcLifeState;
  economy?: NpcEconomyLifeState;
}>): Readonly<{ state: NpcLifeState; decision: NpcLifeDecision }> {
  id.parse(input.npcId); id.parse(input.regionId); id.parse(input.roleId); index.parse(input.resolutionIndex);
  if (input.previous && (input.previous.npcId !== input.npcId || input.previous.lastResolutionIndex >= input.resolutionIndex)) throw new Error("NPC_LIFE_PREVIOUS_STATE_INVALID");
  const needs = Object.freeze({ ...input.needs });
  const observations = Object.freeze([...input.observationIds].sort(compareText));
  if (new Set(observations).size !== observations.length) throw new Error("NPC_LIFE_DUPLICATE_OBSERVATION");
  const opportunities = input.opportunities.map(value => parseNpcLifeOpportunity(value)).slice().sort((a, b) => compareText(a.sourceReceiptId, b.sourceReceiptId) || compareText(a.id, b.id));
  if (opportunities.length > NPC_LIFE_MAX_OPPORTUNITIES || new Set(opportunities.map(value => value.id)).size !== opportunities.length || opportunities.some(value => value.resolutionIndex !== input.resolutionIndex)) throw new Error("NPC_LIFE_OPPORTUNITY_EVIDENCE_INVALID");
  const personality = input.previous?.personality ?? deriveNpcPersonality(input.npcId);
  const relationships = advanceRelationships({ npcId: input.npcId, previous: input.previous, events: input.relationshipEvents, resolutionIndex: input.resolutionIndex });
  const utility = {} as Record<NpcGoal, number>;
  for (const goal of npcLifeGoals) {
    const need = needForGoal[goal];
    const satisfactionBps = clampInt(needs[need] * 10_000, 0, 10_000);
    const pressure = 10_000 - satisfactionBps;
    const opportunity = bestOpportunity(goal, opportunities);
    let score = pressure * 2 + personalityUtility(goal, personality) + memoryUtility(goal, input.memoryEntries, input.resolutionIndex) + relationshipUtility(goal, relationships) + Math.floor((opportunity ? opportunityNet(opportunity) : 0) / 2);
    if (input.previous?.currentGoal === goal) score += input.resolutionIndex - input.previous.currentGoalSinceResolutionIndex < 500 ? 1_500 : 800;
    if (input.previous?.longTermGoal === goal) score += 600;
    if (goal === "seek_safety" && pressure >= 7_500) score += 5_000;
    if (goal === "gather_resources" && pressure >= 8_500) score += 3_000;
    utility[goal] = clampInt(score, 0, 40_000);
  }
  const ranked = npcLifeGoals.slice().sort((a, b) => utility[b] - utility[a] || npcLifeGoals.indexOf(a) - npcLifeGoals.indexOf(b));
  let currentGoal = ranked[0]!;
  const previousGoal = input.previous?.currentGoal;
  const safetyPressure = 10_000 - clampInt(needs.safety * 10_000, 0, 10_000);
  if (previousGoal && currentGoal !== previousGoal && safetyPressure < 7_500 && utility[currentGoal] - utility[previousGoal] < 1_200) currentGoal = previousGoal;
  let longTermGoal = input.previous?.longTermGoal ?? currentGoal;
  let longTermSince = input.previous?.longTermGoalSinceResolutionIndex ?? input.resolutionIndex;
  if (input.previous && currentGoal !== longTermGoal) {
    const held = input.resolutionIndex - input.previous.longTermGoalSinceResolutionIndex;
    if (held >= 1_000 && utility[currentGoal] - utility[longTermGoal] >= 2_500) { longTermGoal = currentGoal; longTermSince = input.resolutionIndex; }
  }
  const currentGoalSince = input.previous?.currentGoal === currentGoal ? input.previous.currentGoalSinceResolutionIndex : input.resolutionIndex;
  const plan = makePlan(currentGoal, opportunities);
  const stateWithoutHash = Object.freeze({ version: NPC_LIFE_VERSION, npcId: input.npcId, homeRegionId: input.previous?.homeRegionId ?? input.regionId, roleId: input.roleId, personality, relationships, currentGoal, currentGoalSinceResolutionIndex: currentGoalSince, longTermGoal, longTermGoalSinceResolutionIndex: longTermSince, plan, ...(input.economy ?? input.previous?.economy ? { economy: Object.freeze(npcEconomyLifeStateSchema.parse(input.economy ?? input.previous!.economy)) } : {}), lastResolutionIndex: input.resolutionIndex, decisionCount: (input.previous?.decisionCount ?? 0) + 1 });
  const state = parseNpcLifeState({ ...stateWithoutHash, stateHash: lifeHash(stateWithoutHash) });
  const utilityBps = Object.freeze({ ...utility });
  const decision: NpcLifeDecision = Object.freeze({ npcId: input.npcId, goal: currentGoal, longTermGoal, needs, observationIds: observations, resolutionIndex: input.resolutionIndex, utilityBps, plan, decisionHash: npcLifeDecisionHash({ npcId: input.npcId, resolutionIndex: input.resolutionIndex, goal: currentGoal, longTermGoal, needs, observationIds: observations, utilityBps, planHash: plan.planHash, stateHash: state.stateHash }) });
  return Object.freeze({ state, decision });
}
