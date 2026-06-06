// Shared Live Gameplay Snapshot Types
// Server-authoritative display-only data for Quest/Skills/Guild/Faction/Map panels
// Determinism: No Date.now(), no Math.random(), no generated fake data

export type LiveDataStatus =
  | "waiting"
  | "live"
  | "empty"
  | "stale";

export interface QuestObjectiveSnapshot {
  id: string;
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestSnapshot {
  id: string;
  title: string;
  description: string;
  status: "available" | "active" | "completed" | "locked";
  objectives: QuestObjectiveSnapshot[];
}

export interface SkillSnapshot {
  id: "woodcutting" | "mining" | "fishing" | "combat" | "crafting";
  title: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;
}

export interface GuildSnapshot {
  id: string | null;
  name: string | null;
  memberCount: number;
  rank: string | null;
  villageEligible: boolean;
  treasury: number | null;
}

export interface FactionStandingSnapshot {
  id: string;
  name: string;
  standing: number;
  label: "hostile" | "neutral" | "trusted" | "allied";
}

export interface MapSnapshot {
  regionName: string;
  chunkX: number | null;
  chunkZ: number | null;
  visibleChunks: number | null;
  biome: string | null;
}

export interface ResourceNodeSnapshot {
  id: string;
  kind: "tree" | "ore" | "fish_spot";
  title: string;
  skillId: "woodcutting" | "mining" | "fishing";
  requiredLevel: number;
  xpReward: number;
  itemRewardId: string;
  itemRewardName: string;
  position: { x: number; y: number };
  radius: number;
  status: "available" | "depleted" | "locked";
  depletedUntilTick: number | null;
  remainingTicks: number;
}

/**
 * Inventory Slot shape (server-authoritative, client display-only)
 */
export interface InventorySlotSnapshot {
  slotId: string;
  itemId: string;
  name: string;
  quantity: number;
  category: "resource" | "quest" | "consumable" | "equipment";
  stackable: boolean;
  maxStack: number;
}

/**
 * Player Inventory Snapshot shape
 */
export interface PlayerInventorySnapshot {
  playerId: string;
  schemaVersion: 1;
  slots: InventorySlotSnapshot[];
  capacity: number;
}

/**
 * Crafting Recipe Ingredient Snapshot shape
 */
export interface CraftingRecipeIngredientSnapshot {
  itemId: string;
  quantity: number;
}

/**
 * Crafting Recipe Output Snapshot shape
 */
export interface CraftingRecipeOutputSnapshot {
  itemId: string;
  quantity: number;
}

/**
 * Crafting Recipe Snapshot shape
 */
export interface CraftingRecipeSnapshot {
  id: string;
  title: string;
  requiredLevel: number;
  craftingXpReward: number;
  ingredients: CraftingRecipeIngredientSnapshot[];
  outputs: CraftingRecipeOutputSnapshot[];
  craftTicks: number;
  craftable: boolean;
  blockedReason?: "level_too_low" | "missing_ingredients";
}

/**
 * Crafting Snapshot shape
 */
export interface CraftingSnapshot {
  recipes: CraftingRecipeSnapshot[];
}

export interface LiveGameplaySnapshot {
  status: LiveDataStatus;
  serverTick: number | null;
  quests: QuestSnapshot[];
  skills: SkillSnapshot[];
  resources: ResourceNodeSnapshot[];
  inventory: PlayerInventorySnapshot;
  crafting: CraftingSnapshot;
  guild: GuildSnapshot;
  factions: FactionStandingSnapshot[];
  map: MapSnapshot;
}

// Default empty snapshot - honest waiting state
export const EMPTY_LIVE_GAMEPLAY_SNAPSHOT: LiveGameplaySnapshot = {
  status: "waiting",
  serverTick: null,
  quests: [],
  skills: [],
  resources: [],
  inventory: {
    playerId: "unknown",
    schemaVersion: 1,
    slots: [],
    capacity: 32,
  },
  crafting: {
    recipes: [],
  },
  guild: {
    id: null,
    name: null,
    memberCount: 0,
    rank: null,
    villageEligible: false,
    treasury: null,
  },
  factions: [],
  map: {
    regionName: "unknown",
    chunkX: null,
    chunkZ: null,
    visibleChunks: null,
    biome: null,
  },
};

// Normalization helper - pure function, no mutation
export function normalizeLiveGameplaySnapshot(
  input: Partial<LiveGameplaySnapshot> | null | undefined
): LiveGameplaySnapshot {
  if (!input) return EMPTY_LIVE_GAMEPLAY_SNAPSHOT;

  return {
    status: input.status ?? "waiting",
    serverTick: typeof input.serverTick === "number" ? input.serverTick : null,
    quests: Array.isArray(input.quests) ? input.quests : [],
    skills: normalizeSkills(input.skills),
    resources: normalizeResources(input.resources),
    inventory: normalizeInventory(input.inventory),
    crafting: normalizeCrafting(input.crafting),
    guild: {
      id: input.guild?.id ?? null,
      name: input.guild?.name ?? null,
      memberCount:
        typeof input.guild?.memberCount === "number"
          ? input.guild.memberCount
          : 0,
      rank: input.guild?.rank ?? null,
      villageEligible: Boolean(input.guild?.villageEligible),
      treasury:
        typeof input.guild?.treasury === "number" ? input.guild.treasury : null,
    },
    factions: Array.isArray(input.factions) ? input.factions : [],
    map: {
      regionName: input.map?.regionName ?? "unknown",
      chunkX:
        typeof input.map?.chunkX === "number" ? input.map.chunkX : null,
      chunkZ:
        typeof input.map?.chunkZ === "number" ? input.map.chunkZ : null,
      visibleChunks:
        typeof input.map?.visibleChunks === "number"
          ? input.map.visibleChunks
          : null,
      biome: input.map?.biome ?? null,
    },
  };
}

/**
 * Normalize skill snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeSkills(input: unknown): SkillSnapshot[] {
  if (!Array.isArray(input)) return [];

  const validIds = new Set(["woodcutting", "mining", "fishing", "combat", "crafting"]);

  return input
    .filter((skill): skill is SkillSnapshot =>
      skill &&
      typeof skill === "object" &&
      typeof (skill as any).id === "string" &&
      validIds.has((skill as any).id) &&
      typeof (skill as any).level === "number" &&
      typeof (skill as any).xp === "number"
    )
    .map((skill: any) => ({
      id: skill.id,
      title: String(skill.title ?? skill.id),
      level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
      xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
      xpForNextLevel: Math.max(1, Math.floor(Number(skill.xpForNextLevel ?? 100))),
      progressRatio: Math.max(0, Math.min(1, Number(skill.progressRatio ?? 0))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Normalize resource node snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeResources(input: unknown): ResourceNodeSnapshot[] {
  if (!Array.isArray(input)) return [];

  const validKinds = new Set(["tree", "ore", "fish_spot"]);
  const validSkillIds = new Set(["woodcutting", "mining", "fishing"]);

  return input
    .filter((node): node is ResourceNodeSnapshot =>
      node &&
      typeof node === "object" &&
      typeof (node as any).id === "string" &&
      validKinds.has((node as any).kind) &&
      validSkillIds.has((node as any).skillId)
    )
    .map((node: any) => ({
      id: String(node.id),
      kind: node.kind,
      title: String(node.title ?? node.id),
      skillId: node.skillId,
      requiredLevel: Math.max(1, Math.floor(Number(node.requiredLevel ?? 1))),
      xpReward: Math.max(0, Math.floor(Number(node.xpReward ?? 0))),
      itemRewardId: String(node.itemRewardId ?? "unknown_item"),
      itemRewardName: String(node.itemRewardName ?? "Unknown Item"),
      position: {
        x: Number(node.position?.x ?? 0),
        y: Number(node.position?.y ?? 0),
      },
      radius: Math.max(1, Number(node.radius ?? 16)),
      status: node.status === "depleted" ? "depleted" : "available",
      depletedUntilTick:
        typeof node.depletedUntilTick === "number" ? node.depletedUntilTick : null,
      remainingTicks: Math.max(0, Math.floor(Number(node.remainingTicks ?? 0))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Normalize inventory snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeInventory(input: unknown): PlayerInventorySnapshot {
  if (!input || typeof input !== "object") {
    return {
      playerId: "unknown",
      schemaVersion: 1,
      slots: [],
      capacity: 32,
    };
  }

  const raw = input as any;

  const slots = Array.isArray(raw.slots)
    ? raw.slots
        .filter(
          (slot: any) =>
            slot &&
            typeof slot === "object" &&
            typeof slot.itemId === "string" &&
            typeof slot.quantity === "number"
        )
        .map((slot: any) => ({
          slotId: String(slot.slotId ?? `slot_${slot.itemId}`),
          itemId: String(slot.itemId),
          name: String(slot.name ?? slot.itemId),
          quantity: Math.max(0, Math.floor(Number(slot.quantity ?? 0))),
          category: (slot.category as PlayerInventorySnapshot["slots"][0]["category"]) ?? "resource",
          stackable: Boolean(slot.stackable ?? true),
          maxStack: Math.max(1, Math.floor(Number(slot.maxStack ?? 999))),
        }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId))
    : [];

  return {
    playerId: String(raw.playerId ?? "unknown"),
    schemaVersion: 1,
    capacity: Math.max(0, Math.floor(Number(raw.capacity ?? 32))),
    slots,
  };
}

/**
 * Normalize crafting snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeCrafting(input: unknown): CraftingSnapshot {
  const raw = input && typeof input === "object" ? (input as any) : {};
  const recipes = Array.isArray(raw.recipes) ? raw.recipes : [];

  return {
    recipes: recipes
      .filter((recipe: any) =>
        recipe &&
        typeof recipe === "object" &&
        typeof recipe.id === "string",
      )
      .map((recipe: any) => ({
        id: String(recipe.id),
        title: String(recipe.title ?? recipe.id),
        requiredLevel: Math.max(1, Math.floor(Number(recipe.requiredLevel ?? 1))),
        craftingXpReward: Math.max(0, Math.floor(Number(recipe.craftingXpReward ?? 0))),
        craftTicks: Math.max(0, Math.floor(Number(recipe.craftTicks ?? 0))),
        craftable: Boolean(recipe.craftable),
        blockedReason: recipe.blockedReason,
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((item: any) => ({
              itemId: String(item.itemId),
              quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
            }))
          : [],
        outputs: Array.isArray(recipe.outputs)
          ? recipe.outputs.map((item: any) => ({
              itemId: String(item.itemId),
              quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
            }))
          : [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}