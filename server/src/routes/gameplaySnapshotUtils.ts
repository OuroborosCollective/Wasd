/**
 * GAMEPLAY SNAPSHOT UTILITIES
 * 
 * Pure functions for gameplay snapshot generation.
 * These functions are deterministic and do not depend on
 * external state or modules.
 * 
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - All values come from server-authoritative state
 * - Empty/null states are honest and allowed
 */

import {
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOT_DEFINITIONS,
  compareEquipmentSlotIds,
  type EquipmentNumberEntry,
  type EquipmentSlotId,
} from "../equipment/EquipmentTypes.js";
import type { NPCActivitySnapshot } from "../gameplay/NPCActivitySnapshot.js";

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

export interface SkillSnapshot {
  id: string;
  title: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;
}

export interface MapSnapshot {
  regionName: string;
  chunkX: number | null;
  chunkZ: number | null;
  visibleChunks: number | null;
  biome: string | null;
  worldPois: WorldPoiSnapshot[];
}

export interface WorldPoiSnapshot {
  id: string;
  type: "logging_camp" | "mining_camp" | "fishing_camp" | "campfire" | "furnace" | "workbench" | "village_trader";
  title: string;
  position: { x: number; y: number };
  chunk: { x: number; z: number };
  interactionRadius: number;
  tags: readonly string[];
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

export interface InventorySlotSnapshot {
  slotId: string;
  itemId: string;
  name: string;
  quantity: number;
  category: "resource" | "quest" | "consumable" | "equipment";
  stackable: boolean;
  maxStack: number;
}

export interface PlayerInventorySnapshot {
  playerId: string;
  schemaVersion: 1;
  slots: InventorySlotSnapshot[];
  capacity: number;
}

export interface CraftingRecipeIngredientSnapshot {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipeOutputSnapshot {
  itemId: string;
  quantity: number;
}

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

export interface CraftingSnapshot {
  recipes: CraftingRecipeSnapshot[];
}

export interface EquippedSlotSnapshot {
  slotId: EquipmentSlotId;
  itemId: string;
  title: string;
  tier?: number;
  displayId?: string;
  iconId?: string;
  stats?: readonly EquipmentNumberEntry[];
  requirements?: readonly EquipmentNumberEntry[];
}

export interface PlayerEquipmentSnapshot {
  playerId: string;
  schemaVersion: 1;
  slots: EquippedSlotSnapshot[];
}

export interface CharacterProfileSnapshot {
  playerId: string;
  characterId: string;
  displayName: string;
  archetype: "wanderer" | "forager" | "miner" | "angler" | "artisan";
  selected: boolean;
}

export interface PaperdollSlotSnapshot {
  slotId: EquipmentSlotId;
  itemId: string | null;
  title: string;
  displayId?: string;
  iconId?: string;
  stats?: readonly EquipmentNumberEntry[];
  requirements?: readonly EquipmentNumberEntry[];
}

export interface PaperdollSnapshot {
  character: CharacterProfileSnapshot | null;
  slots: PaperdollSlotSnapshot[];
}

export interface LiveGameplaySnapshot {
  status: "live";
  serverTick: number;
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
  /** NPC/Monster activity snapshot - server-authoritative activity state */
  npcActivity?: NPCActivitySnapshot;
}

export interface GameplaySnapshotInput {
  serverTick: number;
  character?: CharacterProfileSnapshot | null;
  paperdoll?: PaperdollSnapshot | null;
  quests?: QuestSnapshot[];
  skills?: SkillSnapshot[];
  resources?: ResourceNodeSnapshot[];
  inventory?: PlayerInventorySnapshot | null;
  crafting?: CraftingSnapshot | null;
  equipment?: PlayerEquipmentSnapshot | null;
  guild?: GuildSnapshot | null;
  factions?: FactionStandingSnapshot[];
  map?: Partial<MapSnapshot>;
  npcActivity?: NPCActivitySnapshot | null;
}

function cloneEntries(entries: readonly EquipmentNumberEntry[] | undefined): readonly EquipmentNumberEntry[] | undefined {
  return entries ? entries.map((entry) => ({ key: entry.key, value: entry.value })) : undefined;
}

function enrichPaperdollSlot(slot: PaperdollSlotSnapshot): PaperdollSlotSnapshot {
  if (slot.itemId === null) return slot;
  const definition = EQUIPMENT_DEFINITIONS[slot.itemId];
  const stats = cloneEntries(definition?.stats ?? slot.stats);
  const requirements = cloneEntries(definition?.requirements ?? slot.requirements);

  return {
    slotId: slot.slotId,
    itemId: definition?.itemId ?? slot.itemId,
    title: definition?.title ?? slot.title,
    ...(definition?.displayId || slot.displayId ? { displayId: definition?.displayId ?? slot.displayId } : {}),
    ...(definition?.iconId || slot.iconId ? { iconId: definition?.iconId ?? slot.iconId } : {}),
    ...(stats ? { stats } : {}),
    ...(requirements ? { requirements } : {}),
  };
}

function normalizePaperdoll(input: PaperdollSnapshot | null | undefined, character: CharacterProfileSnapshot | null | undefined): PaperdollSnapshot {
  const bySlot = new Map<EquipmentSlotId, PaperdollSlotSnapshot>();
  for (const slot of input?.slots ?? []) {
    bySlot.set(slot.slotId, slot);
  }

  return {
    character: input?.character ?? character ?? null,
    slots: EQUIPMENT_SLOT_DEFINITIONS.map((definition) => {
      const existing = bySlot.get(definition.slotId);
      return enrichPaperdollSlot(existing ?? {
        slotId: definition.slotId,
        itemId: null,
        title: definition.emptyTitle,
      });
    }).sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)),
  };
}

function normalizeEquipment(equipment: PlayerEquipmentSnapshot | null | undefined): PlayerEquipmentSnapshot | null {
  if (!equipment) return null;

  return {
    ...equipment,
    slots: [...equipment.slots].sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)).map((slot) => {
      const definition = EQUIPMENT_DEFINITIONS[slot.itemId];
      const stats = cloneEntries(definition?.stats ?? slot.stats);
      const requirements = cloneEntries(definition?.requirements ?? slot.requirements);

      return {
        slotId: definition?.slotId ?? slot.slotId,
        itemId: definition?.itemId ?? slot.itemId,
        title: definition?.title ?? slot.title,
        ...(definition?.tier ?? slot.tier ? { tier: definition?.tier ?? slot.tier } : {}),
        ...(definition?.displayId || slot.displayId ? { displayId: definition?.displayId ?? slot.displayId } : {}),
        ...(definition?.iconId || slot.iconId ? { iconId: definition?.iconId ?? slot.iconId } : {}),
        ...(stats ? { stats } : {}),
        ...(requirements ? { requirements } : {}),
      };
    }),
  };
}

export function createGameplaySnapshot(input: GameplaySnapshotInput): LiveGameplaySnapshot {
  const sortedQuests = [...(input.quests ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedSkills = [...(input.skills ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedResources = [...(input.resources ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedFactions = [...(input.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const sortedSlots = [...(input.inventory?.slots ?? [])].sort((a, b) => a.itemId.localeCompare(b.itemId));
  const sortedRecipes = [...(input.crafting?.recipes ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const paperdoll = normalizePaperdoll(input.paperdoll, input.character);
  const equipment = normalizeEquipment(input.equipment);

  const sortedWorldPois: WorldPoiSnapshot[] = [...(input.map?.worldPois ?? [])].sort((a, b) => a.id.localeCompare(b.id)).map(poi => ({
    ...poi,
    tags: [...poi.tags] as readonly string[],
  }));

  return {
    status: "live",
    serverTick: input.serverTick,
    character: input.character ?? null,
    paperdoll,
    quests: sortedQuests,
    skills: sortedSkills,
    resources: sortedResources,
    inventory: input.inventory ? { ...input.inventory, slots: sortedSlots } : {
      playerId: "unknown",
      schemaVersion: 1,
      slots: sortedSlots,
      capacity: 32,
    },
    crafting: {
      recipes: sortedRecipes,
    },
    equipment,
    guild: input.guild ?? {
      id: null,
      name: null,
      memberCount: 0,
      rank: null,
      villageEligible: false,
      treasury: null,
    },
    factions: sortedFactions,
    map: {
      regionName: input.map?.regionName ?? "unknown",
      chunkX: input.map?.chunkX ?? null,
      chunkZ: input.map?.chunkZ ?? null,
      visibleChunks: input.map?.visibleChunks ?? null,
      biome: input.map?.biome ?? null,
      worldPois: sortedWorldPois,
    },
    npcActivity: input.npcActivity ?? undefined,
  };
}

export function createEmptyGameplaySnapshot(serverTick: number): LiveGameplaySnapshot {
  return createGameplaySnapshot({
    serverTick,
    quests: [],
    skills: [],
    inventory: null,
    crafting: null,
    guild: null,
    factions: [],
    map: {},
  });
}
