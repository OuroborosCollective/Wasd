import { cellKey, cellToKappa } from "./KappaMath";
import { SeededARERng } from "./SeededARERng";
import type { BuildingLotPlan, NpcPlan, NpcRole, QuestAffinity, RoadGraphPlan, SettlementPlan } from "./ScenePlanTypes";

const ROLES: readonly NpcRole[] = [
  "elder",
  "blacksmith",
  "trader",
  "healer",
  "guard_captain",
  "guard",
  "farmer",
  "hunter",
  "child",
  "innkeeper",
  "carpenter",
  "wandering_merchant",
  "animal",
];

const AFFINITY_BY_ROLE: Readonly<Record<NpcRole, QuestAffinity>> = {
  elder: "social",
  blacksmith: "crafting",
  trader: "trade",
  healer: "healing",
  guard_captain: "defense",
  guard: "defense",
  farmer: "farming",
  hunter: "hunting",
  child: "social",
  innkeeper: "social",
  carpenter: "crafting",
  wandering_merchant: "exploration",
  animal: "exploration",
};

function lotForRole(role: NpcRole, lots: readonly BuildingLotPlan[]): BuildingLotPlan | null {
  const byType = (type: BuildingLotPlan["buildingType"]) => lots.find((lot) => lot.buildingType === type) ?? null;
  if (role === "blacksmith") return byType("blacksmith");
  if (role === "trader" || role === "wandering_merchant") return byType("trader_shop");
  if (role === "healer") return byType("healer_hut");
  if (role === "guard" || role === "guard_captain") return byType("guard_post");
  if (role === "innkeeper") return byType("inn");
  if (role === "carpenter") return byType("storehouse");
  return lots.find((lot) => lot.buildingType === "house") ?? lots[0] ?? null;
}

function routeFor(role: NpcRole, roads: RoadGraphPlan, rng: SeededARERng): readonly string[] {
  const roadCells = Object.keys(roads.roadCells).sort();
  if (roadCells.length === 0) return [];
  const stride = role === "guard" || role === "guard_captain" ? 2 : role === "wandering_merchant" ? 3 : 4;
  const start = rng.pickIndex(roadCells.length);
  const route: string[] = [];
  for (let i = 0; i < 5; i += 1) route.push(roadCells[(start + i * stride) % roadCells.length]);
  return [...new Set(route)];
}

export function generateNpcPlan(input: { readonly worldSeed: string; readonly chunkX: number; readonly chunkZ: number; readonly roads: RoadGraphPlan; readonly settlement: SettlementPlan; readonly rng: SeededARERng }): readonly NpcPlan[] {
  const npcs: NpcPlan[] = [];
  const roadCells = Object.keys(input.roads.roadCells).sort();

  for (let i = 0; i < ROLES.length; i += 1) {
    const role = ROLES[i];
    const roleRng = input.rng.fork(`npc:${role}:${i}`);
    const work = lotForRole(role, input.settlement.lots);
    const home = role === "animal" || role === "wandering_merchant" ? null : work ?? input.settlement.lots[0] ?? null;
    const fallbackCell = roadCells.length ? roadCells[roleRng.pickIndex(roadCells.length)] : input.settlement.centerCell;
    const [fxRaw, fzRaw] = fallbackCell.split(":");
    const tileX = work ? work.tileX : Number(fxRaw);
    const tileZ = work ? work.tileZ + 1 : Number(fzRaw);
    const dialogueSeed = SeededARERng.compose([input.worldSeed, input.chunkX, input.chunkZ, role, "dialogue"]);
    npcs.push({
      id: `npc_${role}_${i}`,
      role,
      displayNameSeed: SeededARERng.compose([input.worldSeed, role, i]),
      homeLot: home?.id ?? null,
      workLot: work?.id ?? null,
      dialogueSeed,
      questAffinity: AFFINITY_BY_ROLE[role],
      tileX,
      tileZ,
      kappaPos: { x: cellToKappa(tileX), z: cellToKappa(tileZ), h: cellToKappa(0, 0) },
      routeCells: routeFor(role, input.roads, roleRng),
    });
  }

  return npcs;
}
