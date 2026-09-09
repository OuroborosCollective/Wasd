// WASD-owned compatibility rules; existing Aurion v2/v3 identities are preserved.
import { createHash } from "node:crypto";
import type { NpcGoal } from "./npcNeeds.js";

export const AX1_LIVING_WORLD_RULESET = "aurion-ax1-living-world.v2" as const;
export const livingWorldSocialActions = ["negotiation", "diplomacy", "intimidation", "friendship", "trade", "leadership", "politics"] as const;
export type LivingWorldSocialAction = (typeof livingWorldSocialActions)[number];
export type HubId = "observatory_threshold" | "windhollow" | "emberfall" | "cinder_vault";
export type CommodityId = "grain" | "sandstone" | "bronze" | "aether" | "salve" | "rune_core";

export type MarketState = Readonly<{
  hubId: HubId;
  controllingGuild: string;
  taxRateBasisPoints: number;
  treasuryCopper: number;
  stock: Readonly<Record<CommodityId, number>>;
}>;
export type NpcEconomyState = Readonly<{
  npcId: string;
  name: string;
  currentHubId: HubId;
  wealthCopper: number;
  hungerBps: number;
  fatigueBps: number;
  tradeProwessBps: number;
  harvestYieldBps: number;
  memory: readonly string[];
}>;
export type LivingWorldResolution = Readonly<{
  resolutionIndex: number;
  market: MarketState;
  npc: NpcEconomyState;
  preferredGoal: NpcGoal | null;
  action: "consume" | "produce" | "trade" | "caravan" | "patrol" | "rest" | "socialize";
  commodity: CommodityId;
  quantity: number;
  unitPriceCopper: number;
  taxCopper: number;
  caravan: Readonly<{ destination: HubId | null; securityIndex: number; ambushed: boolean }>;
  nextMemory: readonly string[];
  stabilityDelta: number;
  deterministicHash: string;
}>;

const commodityBasePrice: Readonly<Record<CommodityId, number>> = Object.freeze({ grain: 20, sandstone: 45, bronze: 90, aether: 220, salve: 60, rune_core: 450 });
const productionFocus: Readonly<Record<HubId, readonly CommodityId[]>> = Object.freeze({
  observatory_threshold: ["salve", "rune_core"],
  windhollow: ["grain"],
  emberfall: ["sandstone", "bronze"],
  cinder_vault: ["aether", "rune_core"],
});
const routeSecurity: Readonly<Record<string, number>> = Object.freeze({
  "observatory_threshold:windhollow": 85,
  "observatory_threshold:emberfall": 70,
  "observatory_threshold:cinder_vault": 35,
  "windhollow:emberfall": 60,
  "emberfall:cinder_vault": 48,
});

function hash(...parts: readonly (string | number)[]): string {
  return createHash("sha256").update(parts.join("\u001f"), "utf8").digest("hex");
}
function seed32(value: string): number {
  const digest = createHash("sha256").update(value, "utf8").digest();
  return digest.readUInt32BE(0) >>> 0;
}
function next(seed: number): { value: number; seed: number } {
  let state = (seed + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: state };
}
function boundedInt(value: number, min: number, max: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} out of range`);
  return value;
}
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }

/** Damped deterministic pricing adapted from -ax1 AutonomousNPCEconomy. */
export function marketPriceCopper(input: Readonly<{ commodity: CommodityId; stock: number; demandBps: number; taxRateBasisPoints: number; memoryAffinityBps?: number }>): number {
  const stock = Math.max(1, boundedInt(input.stock, 0, 1_000_000, "stock"));
  const demand = boundedInt(input.demandBps, 0, 20_000, "demandBps") / 10_000;
  const tax = boundedInt(input.taxRateBasisPoints, 0, 5_000, "taxRateBasisPoints") / 10_000;
  const affinity = boundedInt(input.memoryAffinityBps ?? 10_000, 2_500, 30_000, "memoryAffinityBps") / 10_000;
  const scarcity = clamp(120 / stock, 0.2, 4);
  const damped = Math.tanh((demand * affinity * scarcity) - 1);
  const beforeTax = commodityBasePrice[input.commodity] * (1 + 0.85 * damped);
  return Math.max(1, Math.round(beforeTax * (1 + tax)));
}

/** Explicit hub topology for authority checks; this is not a physical position proof. */
export function hasLivingWorldRoute(from: HubId, to: HubId): boolean {
  return from !== to && (routeSecurity[`${from}:${to}`] !== undefined || routeSecurity[`${to}:${from}`] !== undefined);
}

export function caravanSecurityIndex(from: HubId, to: HubId, polityStability: number, rememberedThreat: number): number {
  const direct = routeSecurity[`${from}:${to}`] ?? routeSecurity[`${to}:${from}`] ?? 50;
  return Math.round(clamp(direct + clamp(polityStability, -100, 100) * 0.15 - clamp(rememberedThreat, 0, 100) * 0.35, 5, 100));
}

export function socialMasteryEvidence(action: LivingWorldSocialAction, sourceReceiptId: string, resolutionIndex: number): Readonly<{ disciplineId: "diplomacy" | "council" | "sovereignty" | "stewardship"; amountExact: string; sourceReceiptId: string; resolutionIndex: number; reputationDelta: number }> {
  if (!sourceReceiptId || !Number.isSafeInteger(resolutionIndex) || resolutionIndex < 0) throw new Error("social evidence requires server receipt and resolution index");
  const mapping = {
    negotiation: ["diplomacy", "3", 2], diplomacy: ["diplomacy", "5", 4], intimidation: ["sovereignty", "3", -2], friendship: ["stewardship", "4", 5], trade: ["stewardship", "3", 3], leadership: ["council", "5", 4], politics: ["sovereignty", "5", 3],
  } as const;
  const [disciplineId, amountExact, reputationDelta] = mapping[action];
  return Object.freeze({ disciplineId, amountExact, sourceReceiptId, resolutionIndex, reputationDelta });
}

function actionForGoal(goal: NpcGoal | undefined, wealthCopper: number, unitPriceCopper: number): LivingWorldResolution["action"] {
  if (!goal) return wealthCopper < unitPriceCopper * 2 ? "produce" : "trade";
  switch (goal) {
    case "seek_safety": return "patrol";
    case "gather_resources": return "produce";
    case "socialize": return "socialize";
    case "gain_reputation": return "patrol";
    case "trade": return "trade";
    case "expand_influence": return "trade";
  }
}

/** One server-owned fixed logical resolution; browser inputs never choose prices, drops, ticks or outcomes. */
export function resolveLivingWorldTick(input: Readonly<{ worldSeed: string; resolutionIndex: number; market: MarketState; npc: NpcEconomyState; polityStability: number; preferredGoal?: NpcGoal }>): LivingWorldResolution {
  if (!input.worldSeed.trim() || !Number.isSafeInteger(input.resolutionIndex) || input.resolutionIndex < 0 || input.npc.currentHubId !== input.market.hubId) throw new Error("invalid living world context");
  let rng = seed32(`${input.worldSeed}:${input.resolutionIndex}:${input.npc.npcId}:${input.preferredGoal ?? "none"}:${AX1_LIVING_WORLD_RULESET}`);
  const roll = () => { const result = next(rng); rng = result.seed; return result.value; };
  const hunger = boundedInt(input.npc.hungerBps, 0, 10_000, "hungerBps");
  const fatigue = boundedInt(input.npc.fatigueBps, 0, 10_000, "fatigueBps");
  const focus = productionFocus[input.market.hubId];
  const commodity = focus[Math.floor(roll() * focus.length)]!;
  const memoryAffinityBps = input.npc.memory.some(entry => entry.includes(`trade:${input.market.hubId}`)) ? 13_000 : 10_000;
  const demandBps = clamp(5_000 + hunger + Math.round(fatigue * 0.25), 0, 20_000);
  const unitPriceCopper = marketPriceCopper({ commodity, stock: input.market.stock[commodity], demandBps, taxRateBasisPoints: input.market.taxRateBasisPoints, memoryAffinityBps });
  const quantity = Math.max(1, Math.floor((2 + roll() * 4) * clamp(input.npc.harvestYieldBps / 10_000, 0.5, 2)));
  let action: LivingWorldResolution["action"] = hunger >= 7_500 ? "consume" : fatigue >= 8_500 ? "rest" : actionForGoal(input.preferredGoal,input.npc.wealthCopper,unitPriceCopper);
  const destinations = (["observatory_threshold", "windhollow", "emberfall", "cinder_vault"] as const).filter(hub => hub !== input.market.hubId);
  let destination: HubId | null = null;
  let securityIndex = 100;
  let ambushed = false;
  const caravanThreshold = input.preferredGoal === "expand_influence" ? 0.25 : 0.45;
  if (action === "trade" && roll() > caravanThreshold) {
    action = "caravan";
    destination = destinations[Math.floor(roll() * destinations.length)]!;
    const rememberedThreat = input.npc.memory.some(entry => entry.startsWith("danger:")) ? 60 : 10;
    securityIndex = caravanSecurityIndex(input.market.hubId, destination, input.polityStability, rememberedThreat);
    ambushed = roll() < (100 - securityIndex) / 300;
  }
  const taxCopper = action === "trade" || action === "caravan" ? Math.floor(unitPriceCopper * quantity * input.market.taxRateBasisPoints / 10_000) : 0;
  const memoryEntry = action === "caravan" ? `trade:${destination}:${commodity}:${unitPriceCopper}:security=${securityIndex}${ambushed ? ":ambushed" : ""}` : action === "socialize" ? `social:${input.market.hubId}` : `${action}:${input.market.hubId}:${commodity}:${unitPriceCopper}`;
  const nextMemory = Object.freeze([...input.npc.memory, memoryEntry].slice(-24));
  const stabilityDelta = ambushed ? -2 : action === "patrol" ? 1 : action === "socialize" ? 1 : taxCopper > 0 ? 1 : 0;
  const stockDelta = action === "produce" ? quantity : action === "consume" || action === "trade" || action === "caravan" ? -Math.min(quantity, input.market.stock[commodity]) : 0;
  const market: MarketState = Object.freeze({ ...input.market, treasuryCopper: input.market.treasuryCopper + taxCopper, stock: Object.freeze({ ...input.market.stock, [commodity]: Math.max(0, input.market.stock[commodity] + stockDelta) }) });
  const wealthDelta = action === "consume" ? -Math.min(input.npc.wealthCopper, unitPriceCopper) : action === "trade" || action === "caravan" ? unitPriceCopper * quantity - taxCopper : 0;
  const hungerDelta = action === "consume" ? -3_000 : action === "rest" ? 100 : action === "produce" ? 350 : action === "caravan" ? 450 : action === "patrol" ? 300 : action === "socialize" ? 150 : 220;
  const fatigueDelta = action === "rest" ? -3_500 : action === "produce" ? 350 : action === "caravan" ? 550 : action === "patrol" ? 450 : action === "socialize" ? 100 : action === "consume" ? 80 : 180;
  const currentHubId = action === "caravan" && destination && !ambushed ? destination : input.npc.currentHubId;
  const npc: NpcEconomyState = Object.freeze({ ...input.npc, currentHubId, wealthCopper: Math.max(0, input.npc.wealthCopper + wealthDelta), hungerBps: Math.round(clamp(hunger + hungerDelta,0,10_000)), fatigueBps: Math.round(clamp(fatigue + fatigueDelta,0,10_000)), memory: nextMemory });
  const deterministicHash = hash(AX1_LIVING_WORLD_RULESET, input.worldSeed, input.resolutionIndex, npc.npcId, input.preferredGoal ?? "none", action, commodity, quantity, unitPriceCopper, taxCopper, destination ?? "none", securityIndex, ambushed ? 1 : 0, npc.currentHubId, npc.wealthCopper, npc.hungerBps, npc.fatigueBps, ...nextMemory);
  return Object.freeze({ resolutionIndex: input.resolutionIndex, market, npc, preferredGoal: input.preferredGoal ?? null, action, commodity, quantity, unitPriceCopper, taxCopper, caravan: Object.freeze({ destination, securityIndex, ambushed }), nextMemory, stabilityDelta, deterministicHash });
}
