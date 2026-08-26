import {
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOT_DEFINITIONS,
  compareEquipmentSlotIds,
  type EquipmentNumberEntry,
  type EquipmentSlotId,
} from "../equipment/EquipmentTypes.js";
import type { NPCActivitySnapshot } from "../gameplay/NPCActivitySnapshot.js";

export interface QuestObjectiveSnapshot { id: string; label: string; current: number; required: number; completed: boolean }
export interface QuestSnapshot { id: string; title: string; description: string; status: "available" | "active" | "completed" | "locked"; objectives: QuestObjectiveSnapshot[] }
export interface GuildSnapshot { id: string | null; name: string | null; memberCount: number; rank: string | null; villageEligible: boolean; treasury: number | null }
export interface FactionStandingSnapshot { id: string; name: string; standing: number; label: "hostile" | "neutral" | "trusted" | "allied" }
export interface SkillSnapshot { id: string; title: string; level: number; xp: number; xpForNextLevel: number; progressRatio: number }
export interface WorldPoiSnapshot { id: string; type: "logging_camp" | "mining_camp" | "fishing_camp" | "campfire" | "furnace" | "workbench" | "village_trader"; title: string; position: { x: number; y: number }; chunk: { x: number; z: number }; interactionRadius: number; tags: readonly string[] }
export interface MapSnapshot { regionName: string; chunkX: number | null; chunkZ: number | null; visibleChunks: number | null; biome: string | null; worldPois: WorldPoiSnapshot[] }
export interface ResourceNodeSnapshot { id: string; kind: "tree" | "ore" | "fish_spot"; title: string; skillId: "woodcutting" | "mining" | "fishing"; requiredLevel: number; xpReward: number; itemRewardId: string; itemRewardName: string; position: { x: number; y: number }; radius: number; status: "available" | "depleted" | "locked"; depletedUntilTick: number | null; remainingTicks: number }
export interface InventorySlotSnapshot { slotId: string; itemId: string; name: string; quantity: number; category: "resource" | "quest" | "consumable" | "equipment"; stackable: boolean; maxStack: number }
export interface PlayerInventorySnapshot { playerId: string; schemaVersion: 1; slots: InventorySlotSnapshot[]; capacity: number }
export interface CraftingRecipeIngredientSnapshot { itemId: string; quantity: number }
export interface CraftingRecipeOutputSnapshot { itemId: string; quantity: number }
export interface CraftingRecipeSnapshot { id: string; title: string; requiredLevel: number; craftingXpReward: number; ingredients: CraftingRecipeIngredientSnapshot[]; outputs: CraftingRecipeOutputSnapshot[]; craftTicks: number; stationType?: "campfire" | "furnace" | "workbench"; craftable: boolean; blockedReason?: "level_too_low" | "missing_ingredients" | "station_too_far" | "missing_player_position" }
export interface CraftingSnapshot { recipes: CraftingRecipeSnapshot[] }
export interface EquippedSlotSnapshot { slotId: EquipmentSlotId; itemId: string; title: string; tier?: number; displayId?: string; iconId?: string; stats?: readonly EquipmentNumberEntry[]; requirements?: readonly EquipmentNumberEntry[] }
export interface PlayerEquipmentSnapshot { playerId: string; schemaVersion: 1; slots: EquippedSlotSnapshot[] }
export interface CharacterProfileSnapshot { playerId: string; characterId: string; displayName: string; archetype: "wanderer" | "forager" | "miner" | "angler" | "artisan"; selected: boolean }
export interface PaperdollSlotSnapshot { slotId: EquipmentSlotId; itemId: string | null; title: string; displayId?: string; iconId?: string; stats?: readonly EquipmentNumberEntry[]; requirements?: readonly EquipmentNumberEntry[] }
export interface PaperdollSnapshot { character: CharacterProfileSnapshot | null; slots: PaperdollSlotSnapshot[] }

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
  if (slot.itemId === null) {
    // For empty slots, use canonical emptyTitle from slot definition
    const slotDef = EQUIPMENT_SLOT_DEFINITIONS.find((def) => def.slotId === slot.slotId);
    return {
      ...slot,
      title: slotDef?.emptyTitle ?? slot.title,
    };
  }
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
  for (const slot of input?.slots ?? []) bySlot.set(slot.slotId, slot);
  return {
    character: input?.character ?? character ?? null,
    slots: EQUIPMENT_SLOT_DEFINITIONS.map((definition) => enrichPaperdollSlot(bySlot.get(definition.slotId) ?? { slotId: definition.slotId, itemId: null, title: definition.emptyTitle })).sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)),
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

// Bolt: Optimized hot-path snapshot composition sorting using fast relational string comparisons instead of slow localeCompare
export function createGameplaySnapshot(input: GameplaySnapshotInput): LiveGameplaySnapshot {
  const sortedWorldPois: WorldPoiSnapshot[] = [...(input.map?.worldPois ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((poi) => ({ ...poi, tags: [...poi.tags] as readonly string[] }));
  return {
    status: "live",
    serverTick: input.serverTick,
    character: input.character ?? null,
    paperdoll: normalizePaperdoll(input.paperdoll, input.character),
    quests: [...(input.quests ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    skills: [...(input.skills ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    resources: [...(input.resources ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    inventory: input.inventory ? { ...input.inventory, slots: [...input.inventory.slots].sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0)) } : { playerId: "unknown", schemaVersion: 1, slots: [], capacity: 32 },
    crafting: { recipes: [...(input.crafting?.recipes ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) },
    equipment: normalizeEquipment(input.equipment),
    guild: input.guild ?? { id: null, name: null, memberCount: 0, rank: null, villageEligible: false, treasury: null },
    factions: [...(input.factions ?? [])].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    map: { regionName: input.map?.regionName ?? "unknown", chunkX: input.map?.chunkX ?? null, chunkZ: input.map?.chunkZ ?? null, visibleChunks: input.map?.visibleChunks ?? null, biome: input.map?.biome ?? null, worldPois: sortedWorldPois },
    npcActivity: input.npcActivity ?? undefined,
  };
}

export function createEmptyGameplaySnapshot(serverTick: number): LiveGameplaySnapshot {
  return createGameplaySnapshot({ serverTick, quests: [], skills: [], inventory: null, crafting: null, guild: null, factions: [], map: {} });
}
