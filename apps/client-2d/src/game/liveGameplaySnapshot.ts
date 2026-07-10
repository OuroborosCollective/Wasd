// Shared Live Gameplay Snapshot Types
// Server-authoritative display-only data for Quest/Skills/Guild/Faction/Map/Character panels
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
  stationType?: "campfire" | "furnace" | "workbench";
  craftable: boolean;
  blockedReason?: "level_too_low" | "missing_ingredients" | "station_too_far" | "missing_player_position";
}

/**
 * Crafting Snapshot shape
 */
export interface CraftingSnapshot {
  recipes: CraftingRecipeSnapshot[];
}

/**
 * Processing station snapshot for crafting UI.
 */
export interface ProcessingStationSnapshot {
  id: string;
  type: "campfire" | "furnace" | "workbench";
  title: string;
  x: number;
  y: number;
  interactionRadius: number;
}

/**
 * Equipped Slot Snapshot shape
 */
export interface EquippedSlotSnapshot {
  slotId: "woodcutting_tool" | "mining_tool" | "fishing_tool" | "weapon" | "armor" | "helmet" | "boots" | "ring" | "amulet";
  itemId: string;
  title: string;
  tier: number;
}

/**
 * Player Equipment Snapshot shape
 */
export interface PlayerEquipmentSnapshot {
  playerId: string;
  schemaVersion: 1;
  slots: EquippedSlotSnapshot[];
}

/**
 * Character Profile Snapshot shape
 */
export interface CharacterProfileSnapshot {
  playerId: string;
  characterId: string;
  displayName: string;
  archetype: "wanderer" | "forager" | "miner" | "angler" | "artisan";
  selected: boolean;
}

/**
 * Paperdoll Slot Snapshot shape
 */
export interface PaperdollSlotSnapshot {
  slotId: string;
  itemId: string | null;
  title: string;
}

/**
 * Paperdoll Snapshot shape
 */
export interface PaperdollSnapshot {
  character: CharacterProfileSnapshot | null;
  slots: PaperdollSlotSnapshot[];
}

/**
 * Wallet Snapshot shape (coin balance)
 */
export interface WalletSnapshot {
  coin: number;
}

/**
 * World POI shape
 */
export interface WorldPoiSnapshot {
  poiId: string;
  type: string;
  title: string;
  x: number;
  y: number;
  chunkX: number;
  chunkZ: number;
  /** Whether this POI has been discovered by the player */
  discovered?: boolean;
}

/**
 * Discovery stats for map display.
 */
export interface DiscoveryStats {
  discoveredPoiCount: number;
  discoveredChunkCount: number;
  visiblePoiCount: number;
}

/**
 * Recently discovered POI for client feedback.
 */
export interface RecentDiscovery {
  poiId: string;
  title: string;
  type: string;
}

/**
 * Vendor stock item snapshot
 */
export interface VendorStockItemSnapshot {
  itemId: string;
  quantity: number;
}

/**
 * Vendor price item snapshot
 */
export interface VendorPriceItemSnapshot {
  itemId: string;
  unitPrice: number;
  basePrice: number;
  demandBand: "normal" | "stocked" | "oversupplied";
}

/**
 * Individual vendor economy snapshot
 */
export interface VendorEconomySnapshot {
  id: string;
  name: string;
  stock: VendorStockItemSnapshot[];
  prices: VendorPriceItemSnapshot[];
}

/**
 * Vendor economy container snapshot
 */
export interface VendorEconomyContainerSnapshot {
  vendors: VendorEconomySnapshot[];
}

/**
 * Camp NPC activity state.
 */
export type CampNpcActivity = "gathering" | "returning" | "depositing";

/**
 * Camp NPC state.
 */
export type CampNpcState = "idle" | "working" | "resting";

/**
 * Camp NPC position.
 */
export interface CampNpcPosition {
  x: number;
  y: number;
}

/**
 * Camp NPC type.
 */
export type CampNpcType = "camp_woodcutter" | "camp_miner" | "camp_fisher";

/**
 * Camp NPC snapshot for display.
 */
export interface CampNpcSnapshot {
  id: string;
  type: CampNpcType;
  name: string;
  role: string;
  poiId: string;
  position: CampNpcPosition;
  state: CampNpcState;
  activity: CampNpcActivity;
  activityMessage: string;
}

/**
 * Camp stock item entry.
 */
export interface CampStockItemSnapshot {
  itemId: string;
  quantity: number;
  /** Buy price in coins, null if not buyable from camp */
  buyPrice?: number | null;
}

/**
 * Camp stock snapshot for display.
 */
export interface CampStockSnapshot {
  poiId: string;
  items: CampStockItemSnapshot[];
  lastUpdatedTick: number;
}

/**
 * Aggregated equipment stats from server-authoritative equipment state.
 * All values are integers. Defaults to 0 for all stats.
 */
export interface EquipmentStats {
  attackPower: number;
  defense: number;
  maxHealth: number;
  maxStamina: number;
  magicFind: number;
  gatheringYield: number;
  gatheringXp: number;
  lootQuality: number;
  criticalChancePerMille: number;
}

/** Zero-equipment baseline for honest empty display */
export const EMPTY_EQUIPMENT_STATS: EquipmentStats = Object.freeze({
  attackPower: 0,
  defense: 0,
  maxHealth: 0,
  maxStamina: 0,
  magicFind: 0,
  gatheringYield: 0,
  gatheringXp: 0,
  lootQuality: 0,
  criticalChancePerMille: 0,
});

export interface LiveGameplaySnapshot {
  status: LiveDataStatus;
  serverTick: number | null;
  character: CharacterProfileSnapshot | null;
  paperdoll: PaperdollSnapshot;
  quests: QuestSnapshot[];
  skills: SkillSnapshot[];
  resources: ResourceNodeSnapshot[];
  inventory: PlayerInventorySnapshot;
  crafting: CraftingSnapshot;
  equipment: PlayerEquipmentSnapshot | null;
  guild: GuildSnapshot;
  factions: FactionStandingSnapshot[];
  map: MapSnapshot;
  wallet: WalletSnapshot;
  worldPois: WorldPoiSnapshot[];
  vendorEconomy: VendorEconomyContainerSnapshot;
  /** Discovery stats for map display */
  discoveryStats?: DiscoveryStats;
  /** Recently discovered POIs for client feedback */
  recentDiscoveries?: RecentDiscovery[];
  /** Camp NPCs at discovered gathering camp POIs */
  campNpcs: CampNpcSnapshot[];
  /** Camp stock at discovered gathering camp POIs */
  campStocks: CampStockSnapshot[];
  /** Aggregated equipment stats from all equipped items (server-computed) */
  equipmentStats?: EquipmentStats;
  /** Processing stations for crafting UI */
  processingStations: ProcessingStationSnapshot[];
  /** Active NPC quests for the player */
  activeQuests?: NpcQuestProgressSnapshot[];
  /** Available NPC quests for the player */
  availableQuests?: NpcQuestProgressSnapshot[];
  /** IDs of completed quests */
  completedQuestIds?: string[];
  /** NPC dialogues for nearby NPCs */
  npcDialogues?: NpcDialogueSnapshot[];
  /** NPC reputations for the player */
  npcReputations?: NpcReputationSnapshot[];
  /** NPC memory snapshots for the player */
  npcMemories?: NpcMemorySnapshot[];
  /** NPC rumor snapshots for the player */
  npcRumors?: NpcRumorSnapshot[];
}

/**
 * Quest objective for NPC quest system.
 */
export interface NpcQuestObjectiveSnapshot {
  objectiveId: string;
  title: string;
  current: number;
  required: number;
  completed: boolean;
}

/**
 * Quest progress for NPC quest system.
 */
export interface NpcQuestProgressSnapshot {
  questId: string;
  state: "available" | "active" | "ready_to_complete" | "completed";
  objectives: NpcQuestObjectiveSnapshot[];
}

/**
 * NPC dialogue state.
 */
export type NpcDialogueStateType =
  | "quest_available"
  | "quest_active_missing_wood"
  | "quest_active_ready_to_process"
  | "quest_active_ready_to_sell"
  | "quest_ready_to_complete"
  | "quest_completed";

/**
 * NPC dialogue snapshot.
 */
export interface NpcDialogueSnapshot {
  npcId: string;
  displayName: string;
  dialogueState: NpcDialogueStateType;
  line: string;
  availableQuestIds: string[];
  activeQuestIds: string[];
  completedQuestIds: string[];
}

/**
 * NPC reputation snapshot.
 */
export interface NpcReputationSnapshot {
  npcId: string;
  playerId: string;
  reputation: number;
  completedQuestIds: string[];
}

/**
 * Trust tier for NPC-player relationship.
 */
export type TrustTier = "hostile" | "cold" | "neutral" | "trusted" | "honored";

/**
 * NPC memory snapshot for server-authoritative display.
 */
export interface NpcMemorySnapshot {
  npcId: string;
  playerId: string;
  reputation: number;
  trustTier: TrustTier;
  memoryEventCount: number;
  recentMemoryNotes: readonly string[];
  knownRumorCount: number;
}

/**
 * Rumor kinds for NPC memory system.
 */
export type NpcRumorKind =
  | "helped_village"
  | "reliable_supplier"
  | "troublemaker"
  | "hostile_actor"
  | "trusted_worker";

/**
 * NPC rumor snapshot for server-authoritative display.
 */
export interface NpcRumorSnapshot {
  rumorId: string;
  npcId: string;
  playerId: string;
  kind: NpcRumorKind;
  weight: number;
  note: string;
  sourceNpcId: string;
}

// Default empty snapshot - honest waiting state
export const EMPTY_LIVE_GAMEPLAY_SNAPSHOT: LiveGameplaySnapshot = {
  status: "waiting",
  serverTick: null,
  character: null,
  paperdoll: {
    character: null,
    slots: [],
  },
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
  equipment: null,
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
  wallet: {
    coin: 0,
  },
  worldPois: [],
  vendorEconomy: {
    vendors: [],
  },
  campNpcs: [],
  campStocks: [],
  processingStations: [],
};

// Normalization helper - pure function, no mutation
// Returns EMPTY_LIVE_GAMEPLAY_SNAPSHOT on any error to prevent crashes
export function normalizeLiveGameplaySnapshot(
  input: Partial<LiveGameplaySnapshot> | null | undefined
): LiveGameplaySnapshot {
  try {
    if (!input) return EMPTY_LIVE_GAMEPLAY_SNAPSHOT;

    return {
      status: (input.status && typeof input.status === "string") ? input.status : "waiting",
      serverTick: typeof input.serverTick === "number" ? input.serverTick : null,
      character: normalizeCharacter(input.character),
      paperdoll: normalizePaperdoll(input.paperdoll),
      quests: Array.isArray(input.quests) ? input.quests : [],
      skills: normalizeSkills(input.skills),
      resources: normalizeResources(input.resources),
      inventory: normalizeInventory(input.inventory),
      crafting: normalizeCrafting(input.crafting),
      equipment: normalizeEquipment(input.equipment),
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
      wallet: {
        coin: typeof input.wallet?.coin === "number" ? Math.max(0, Math.floor(input.wallet.coin)) : 0,
      },
      worldPois: normalizeWorldPois(input.worldPois),
      vendorEconomy: normalizeVendorEconomy(input.vendorEconomy),
      campNpcs: normalizeCampNpcs(input.campNpcs),
      campStocks: normalizeCampStocks(input.campStocks),
      equipmentStats: normalizeEquipmentStats(input.equipmentStats),
      processingStations: normalizeProcessingStations(input.processingStations),
    };
  } catch (error) {
    // Never crash the client - return empty snapshot on normalization error
    console.error("[LiveGameplaySnapshot] normalize failed:", error);
    return EMPTY_LIVE_GAMEPLAY_SNAPSHOT;
  }
}

/**
 * Normalize world POI snapshots from server.
 * Pure function - no mutation of input.
 */
/** Validation constants hoisted for performance */
const SKILL_IDS = new Set(["woodcutting", "mining", "fishing", "combat", "crafting"]);
const RESOURCE_KINDS = new Set(["tree", "ore", "fish_spot"]);
const RESOURCE_SKILL_IDS = new Set(["woodcutting", "mining", "fishing"]);
const VENDOR_DEMAND_BANDS = ["normal", "stocked", "oversupplied"];
const CAMP_NPC_TYPES = ["camp_woodcutter", "camp_miner", "camp_fisher"];
const CAMP_NPC_STATES = ["idle", "working", "resting"];
const CAMP_NPC_ACTIVITIES = ["gathering", "returning", "depositing"];
const PROCESSING_STATION_TYPES = ["campfire", "furnace", "workbench"];
const ARCHETYPES = ["wanderer", "forager", "miner", "angler", "artisan"];

export function normalizeWorldPois(input: unknown): WorldPoiSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((poi): poi is WorldPoiSnapshot =>
      poi &&
      typeof poi === "object" &&
      typeof (poi as any).poiId === "string" &&
      typeof (poi as any).type === "string" &&
      typeof (poi as any).title === "string"
    )
    .map((poi: any) => ({
      poiId: String(poi.poiId),
      type: String(poi.type),
      title: String(poi.title),
      x: Number(poi.x ?? 0),
      y: Number(poi.y ?? 0),
      chunkX: Number(poi.chunkX ?? 0),
      chunkZ: Number(poi.chunkZ ?? 0),
      discovered: poi.discovered ?? true, // Preserve discovery state, default to true for backward compat
    }))
    .sort((a, b) => (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
}

/**
 * Normalize skill snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeSkills(input: unknown): SkillSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((skill): skill is SkillSnapshot =>
      skill &&
      typeof skill === "object" &&
      typeof (skill as any).id === "string" &&
      SKILL_IDS.has((skill as any).id) &&
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
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Normalize resource node snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeResources(input: unknown): ResourceNodeSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((node): node is ResourceNodeSnapshot =>
      node &&
      typeof node === "object" &&
      typeof (node as any).id === "string" &&
      RESOURCE_KINDS.has((node as any).kind) &&
      RESOURCE_SKILL_IDS.has((node as any).skillId)
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
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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
        .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))
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
        stationType: recipe.stationType as CraftingRecipeSnapshot["stationType"],
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
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/**
 * Normalize equipment snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeEquipment(input: unknown): PlayerEquipmentSnapshot | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as any;

  return {
    playerId: String(raw.playerId ?? "unknown"),
    schemaVersion: 1,
    slots: Array.isArray(raw.slots)
      ? raw.slots
          .filter((slot: any) => slot && typeof slot === "object")
          .map((slot: any) => ({
            slotId: slot.slotId,
            itemId: String(slot.itemId ?? ""),
            title: String(slot.title ?? slot.itemId ?? "Unknown Tool"),
            tier: Math.max(1, Math.floor(Number(slot.tier ?? 1))),
          }))
          .sort((a, b) => (a.slotId < b.slotId ? -1 : a.slotId > b.slotId ? 1 : 0))
      : [],
  };
}

/**
 * Normalize character profile snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeCharacter(input: unknown): CharacterProfileSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  return {
    playerId: String(raw.playerId ?? "unknown"),
    characterId: String(raw.characterId ?? "unknown"),
    displayName: String(raw.displayName ?? "Wanderer"),
    archetype: ARCHETYPES.includes(raw.archetype)
      ? raw.archetype
      : "wanderer",
    selected: Boolean(raw.selected ?? true),
  };
}

/**
 * Normalize paperdoll snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizePaperdoll(input: unknown): PaperdollSnapshot {
  const raw = input && typeof input === "object" ? (input as any) : {};

  return {
    character: normalizeCharacter(raw.character),
    slots: Array.isArray(raw.slots)
      ? raw.slots.map((slot: any) => ({
          slotId: String(slot.slotId ?? "unknown_slot"),
          itemId: slot.itemId === null || slot.itemId === undefined
            ? null
            : String(slot.itemId),
          title: String(slot.title ?? "Empty"),
        })).sort((a, b) => (a.slotId < b.slotId ? -1 : a.slotId > b.slotId ? 1 : 0))
      : [],
  };
}

/**
 * Normalize vendor stock item from server.
 * Pure function - no mutation of input.
 */
function normalizeVendorStockItem(input: unknown): VendorStockItemSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  return {
    itemId: String(raw.itemId ?? ""),
    quantity: Math.max(0, Math.floor(Number(raw.quantity ?? 0))),
  };
}

/**
 * Normalize vendor price item from server.
 * Pure function - no mutation of input.
 */
function normalizeVendorPriceItem(input: unknown): VendorPriceItemSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  const demandBand = VENDOR_DEMAND_BANDS.includes(raw.demandBand) ? raw.demandBand : "normal";

  return {
    itemId: String(raw.itemId ?? ""),
    unitPrice: Math.max(0, Math.floor(Number(raw.unitPrice ?? 0))),
    basePrice: Math.max(0, Math.floor(Number(raw.basePrice ?? 0))),
    demandBand,
  };
}

/**
 * Normalize vendor economy snapshot from server.
 * Pure function - no mutation of input.
 */
function normalizeVendorEconomy(input: unknown): VendorEconomyContainerSnapshot {
  if (!input || typeof input !== "object") {
    return { vendors: [] };
  }

  const raw = input as any;
  const vendors = Array.isArray(raw.vendors) ? raw.vendors : [];

  return {
    vendors: vendors
      .filter((v: any) => v && typeof v === "object" && typeof v.id === "string")
      .map((v: any) => ({
        id: String(v.id),
        name: String(v.name ?? v.id),
        stock: Array.isArray(v.stock)
          ? v.stock
              .map(normalizeVendorStockItem)
              .filter((s): s is VendorStockItemSnapshot => s !== null)
              .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))
          : [],
        prices: Array.isArray(v.prices)
          ? v.prices
              .map(normalizeVendorPriceItem)
              .filter((p): p is VendorPriceItemSnapshot => p !== null)
              .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))
          : [],
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/**
 * Get price info for an item from vendor economy snapshot.
 * Returns undefined if vendor economy is not available.
 */
export function getVendorPriceForItem(
  vendorEconomy: VendorEconomyContainerSnapshot,
  vendorId: string,
  itemId: string,
): VendorPriceItemSnapshot | undefined {
  const vendor = vendorEconomy.vendors.find((v) => v.id === vendorId);
  if (!vendor) return undefined;
  return vendor.prices.find((p) => p.itemId === itemId);
}

/**
 * Normalize camp NPC snapshot from server.
 * Pure function - no mutation of input.
 */
function normalizeCampNpc(input: unknown): CampNpcSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  return {
    id: String(raw.id ?? ""),
    type: CAMP_NPC_TYPES.includes(raw.type) ? raw.type : "camp_woodcutter",
    name: String(raw.name ?? "Unknown"),
    role: String(raw.role ?? "Worker"),
    poiId: String(raw.poiId ?? ""),
    position: {
      x: Number(raw.position?.x ?? 0),
      y: Number(raw.position?.y ?? 0),
    },
    state: CAMP_NPC_STATES.includes(raw.state) ? raw.state : "idle",
    activity: CAMP_NPC_ACTIVITIES.includes(raw.activity) ? raw.activity : "gathering",
    activityMessage: String(raw.activityMessage ?? ""),
  };
}

/**
 * Normalize camp NPC snapshots from server.
 * Pure function - no mutation of input.
 */
function normalizeCampNpcs(input: unknown): CampNpcSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .map(normalizeCampNpc)
    .filter((npc): npc is CampNpcSnapshot => npc !== null && npc.id !== "")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Normalize camp stock item from server.
 * Pure function - no mutation of input.
 */
function normalizeCampStockItem(input: unknown): CampStockItemSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  return {
    itemId: String(raw.itemId ?? ""),
    quantity: Math.max(0, Math.floor(Number(raw.quantity ?? 0))),
    buyPrice: raw.buyPrice != null ? Math.max(0, Math.floor(Number(raw.buyPrice))) : null,
  };
}

/**
 * Normalize camp stock snapshot from server.
 * Pure function - no mutation of input.
 */
function normalizeCampStock(input: unknown): CampStockSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  return {
    poiId: String(raw.poiId ?? ""),
    items: Array.isArray(raw.items)
      ? raw.items
          .map(normalizeCampStockItem)
          .filter((item): item is CampStockItemSnapshot => item !== null && item.quantity > 0)
          .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))
      : [],
    lastUpdatedTick: Math.max(0, Math.floor(Number(raw.lastUpdatedTick ?? 0))),
  };
}

/**
 * Normalize camp stock snapshots from server.
 * Pure function - no mutation of input.
 */
function normalizeCampStocks(input: unknown): CampStockSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .map(normalizeCampStock)
    .filter((stock): stock is CampStockSnapshot => stock !== null && stock.poiId !== "")
    .sort((a, b) => (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
}

/**
 * Normalize equipment stats from server.
 * Pure function - no mutation of input.
 * Returns EMPTY_EQUIPMENT_STATS if input is absent or invalid.
 */
export function normalizeEquipmentStats(input: unknown): EquipmentStats {
  if (!input || typeof input !== "object") return EMPTY_EQUIPMENT_STATS;
  const raw = input as any;

  return {
    attackPower: Math.max(0, Math.floor(Number(raw.attackPower ?? 0))),
    defense: Math.max(0, Math.floor(Number(raw.defense ?? 0))),
    maxHealth: Math.max(0, Math.floor(Number(raw.maxHealth ?? 0))),
    maxStamina: Math.max(0, Math.floor(Number(raw.maxStamina ?? 0))),
    magicFind: Math.max(0, Math.floor(Number(raw.magicFind ?? 0))),
    gatheringYield: Math.max(0, Math.floor(Number(raw.gatheringYield ?? 0))),
    gatheringXp: Math.max(0, Math.floor(Number(raw.gatheringXp ?? 0))),
    lootQuality: Math.max(0, Math.floor(Number(raw.lootQuality ?? 0))),
    criticalChancePerMille: Math.max(0, Math.floor(Number(raw.criticalChancePerMille ?? 0))),
  };
}

/**
 * Normalize a single processing station from server.
 * Pure function - no mutation of input.
 */
function normalizeProcessingStation(input: unknown): ProcessingStationSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as any;

  const type = PROCESSING_STATION_TYPES.includes(raw.type) ? raw.type : "workbench";

  return {
    id: String(raw.id ?? ""),
    type,
    title: String(raw.title ?? "Station"),
    x: Number(raw.x ?? 0),
    y: Number(raw.y ?? 0),
    interactionRadius: Math.max(1, Math.floor(Number(raw.interactionRadius ?? 32))),
  };
}

/**
 * Normalize processing station snapshots from server.
 * Pure function - no mutation of input.
 */
export function normalizeProcessingStations(input: unknown): ProcessingStationSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .map(normalizeProcessingStation)
    .filter((station): station is ProcessingStationSnapshot => station !== null && station.id !== "")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}