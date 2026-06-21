/**
 * Deterministic camp quest offer generation for discovered gathering camps.
 *
 * This file stays pure: it derives quest shape from playerId + POI + logical tick
 * and never mutates runtime state. Accept, completion, inventory consumption, XP,
 * and wallet rewards are handled by server action paths in CampQuestService.
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { SkillId } from "../skills/SkillTypes.js";
import type { LiveGameplayQuestProgress, LiveGameplayQuestReward } from "../gameplay/LiveGameplaySnapshotTypes.js";

export const CAMP_QUEST_CYCLE_TICKS = 10 * 60 * 30;
export const CAMP_QUEST_ID_PREFIX = "camp_daily:";

export type GatheringCampPoiType = "logging_camp" | "mining_camp" | "fishing_camp";

export interface CampQuestPoi {
  readonly poiId: string;
  readonly type: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly chunkX: number;
  readonly chunkZ: number;
}

interface GatheringCampQuestPoi extends CampQuestPoi {
  readonly type: GatheringCampPoiType;
}

export interface GenerateCampQuestOffersInput {
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly worldPois: readonly CampQuestPoi[];
  readonly discoveredPoiIds: readonly string[];
  readonly completedQuestIds?: readonly string[];
  readonly hiddenQuestIds?: readonly string[];
}

export interface CampQuestTemplate {
  readonly title: string;
  readonly description: string;
  readonly objectiveTitle: string;
  readonly requiredItemId: InventoryItemId;
  readonly objectiveRequired: number;
  readonly rewardSkillId: SkillId;
  readonly reward: LiveGameplayQuestReward;
}

export interface ParsedCampQuestId {
  readonly poiId: string;
  readonly cycle: number;
}

export interface CampQuestOfferDetails {
  readonly quest: LiveGameplayQuestProgress;
  readonly poi: CampQuestPoi;
  readonly parsed: ParsedCampQuestId;
  readonly requiredItemId: InventoryItemId;
  readonly requiredQuantity: number;
  readonly rewardSkillId: SkillId;
}

export interface ResolveCampQuestOfferInput {
  readonly playerId: string;
  readonly questId: string;
  readonly worldPois: readonly CampQuestPoi[];
  readonly discoveredPoiIds: readonly string[];
}

const TEMPLATES: Record<GatheringCampPoiType, readonly CampQuestTemplate[]> = Object.freeze({
  logging_camp: Object.freeze([
    {
      title: "Wood Delivery",
      description: "The logging crew needs a fresh wood-log delivery before the next hauling run.",
      objectiveTitle: "Deliver 6 Wood Logs to the camp",
      requiredItemId: "wood_log",
      objectiveRequired: 6,
      rewardSkillId: "woodcutting",
      reward: { coins: 18, gatheringXp: 30, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Tool Handle Supply",
      description: "The foreman needs backup handles before production dips.",
      objectiveTitle: "Deliver 3 Wood Logs for tool handles",
      requiredItemId: "wood_log",
      objectiveRequired: 3,
      rewardSkillId: "woodcutting",
      reward: { coins: 12, gatheringXp: 20, craftingXp: 5, reputation: 1 },
    },
  ]),
  mining_camp: Object.freeze([
    {
      title: "Ore Sample Run",
      description: "The miners need a clean ore sample logged for the next smelting batch.",
      objectiveTitle: "Deliver 5 Copper Ore to the camp",
      requiredItemId: "copper_ore",
      objectiveRequired: 5,
      rewardSkillId: "mining",
      reward: { coins: 22, gatheringXp: 34, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Ore Sorting",
      description: "The mining crew needs copper ore sorted before the next work cycle.",
      objectiveTitle: "Deliver 4 Copper Ore to the camp",
      requiredItemId: "copper_ore",
      objectiveRequired: 4,
      rewardSkillId: "mining",
      reward: { coins: 16, gatheringXp: 24, craftingXp: 4, reputation: 1 },
    },
  ]),
  fishing_camp: Object.freeze([
    {
      title: "Fresh Catch Order",
      description: "The fishing camp needs a fresh catch counted before the next trader leaves.",
      objectiveTitle: "Deliver 5 Raw Fish to the camp",
      requiredItemId: "raw_fish",
      objectiveRequired: 5,
      rewardSkillId: "fishing",
      reward: { coins: 20, gatheringXp: 32, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Ration Check",
      description: "The net crew needs small catches inspected after the last tide cycle.",
      objectiveTitle: "Deliver 3 Raw Fish for camp rationing",
      requiredItemId: "raw_fish",
      objectiveRequired: 3,
      rewardSkillId: "fishing",
      reward: { coins: 14, gatheringXp: 22, craftingXp: 4, reputation: 1 },
    },
  ]),
});

export function isGatheringCampPoiType(value: string): value is GatheringCampPoiType {
  return value === "logging_camp" || value === "mining_camp" || value === "fishing_camp";
}

function isDiscoveredGatheringCampPoi(poi: CampQuestPoi, discovered: ReadonlySet<string>): poi is GatheringCampQuestPoi {
  return discovered.has(poi.poiId) && isGatheringCampPoiType(poi.type);
}

export function isCampQuestId(value: string): boolean {
  return parseCampQuestId(value) !== null;
}

export function parseCampQuestId(questId: string): ParsedCampQuestId | null {
  const trimmed = questId.trim();
  if (!trimmed.startsWith(CAMP_QUEST_ID_PREFIX)) return null;

  const lastSeparator = trimmed.lastIndexOf(":");
  if (lastSeparator <= CAMP_QUEST_ID_PREFIX.length) return null;

  const poiId = trimmed.slice(CAMP_QUEST_ID_PREFIX.length, lastSeparator);
  const cycleRaw = trimmed.slice(lastSeparator + 1);

  if (!poiId || poiId.length > 96) return null;
  if (!/^[a-zA-Z0-9_:-]+$/.test(poiId)) return null;
  if (!/^\d{1,12}$/.test(cycleRaw)) return null;

  const cycle = Number(cycleRaw);
  if (!Number.isSafeInteger(cycle) || cycle < 0) return null;

  return Object.freeze({ poiId, cycle });
}

export function getCampQuestCycle(logicalIndex: number): number {
  const safeTick = Number.isSafeInteger(logicalIndex) && logicalIndex >= 0 ? logicalIndex : 0;
  return Math.floor(safeTick / CAMP_QUEST_CYCLE_TICKS);
}

export function campQuestIdFor(poiId: string, logicalIndex: number): string {
  return campQuestIdForCycle(poiId, getCampQuestCycle(logicalIndex));
}

export function campQuestIdForCycle(poiId: string, cycle: number): string {
  const safeCycle = Number.isSafeInteger(cycle) && cycle >= 0 ? cycle : 0;
  return `${CAMP_QUEST_ID_PREFIX}${poiId}:${safeCycle}`;
}

export function generateCampQuestOfferDetails(input: GenerateCampQuestOffersInput): readonly CampQuestOfferDetails[] {
  const playerId = input.playerId.trim();
  if (!playerId) return Object.freeze([]);

  const cycle = getCampQuestCycle(input.logicalIndex);
  const discovered = new Set(input.discoveredPoiIds.filter(Boolean));
  const completed = new Set(input.completedQuestIds ?? []);
  const hidden = new Set(input.hiddenQuestIds ?? []);

  const offers = input.worldPois
    .filter((poi): poi is GatheringCampQuestPoi => isDiscoveredGatheringCampPoi(poi, discovered))
    .sort((a, b) => a.poiId.localeCompare(b.poiId))
    .map((poi): CampQuestOfferDetails | null => {
      const questId = campQuestIdForCycle(poi.poiId, cycle);
      if (completed.has(questId) || hidden.has(questId)) return null;
      return buildCampQuestOfferDetails({ playerId, poi, cycle });
    })
    .filter((quest): quest is CampQuestOfferDetails => quest !== null)
    .sort((a, b) => a.quest.questId.localeCompare(b.quest.questId));

  return Object.freeze(offers);
}

export function generateCampQuestOffers(input: GenerateCampQuestOffersInput): readonly LiveGameplayQuestProgress[] {
  return Object.freeze(generateCampQuestOfferDetails(input).map((details) => details.quest));
}

export function resolveCampQuestOffer(input: ResolveCampQuestOfferInput): CampQuestOfferDetails | null {
  const playerId = input.playerId.trim();
  if (!playerId) return null;

  const parsed = parseCampQuestId(input.questId);
  if (!parsed) return null;

  const discovered = new Set(input.discoveredPoiIds.filter(Boolean));
  const poi = input.worldPois.find((candidate) => candidate.poiId === parsed.poiId);
  if (!poi || !isDiscoveredGatheringCampPoi(poi, discovered)) return null;

  return buildCampQuestOfferDetails({ playerId, poi, cycle: parsed.cycle });
}

function buildCampQuestOfferDetails(input: {
  readonly playerId: string;
  readonly poi: GatheringCampQuestPoi;
  readonly cycle: number;
}): CampQuestOfferDetails {
  const templatePool = TEMPLATES[input.poi.type];
  const template = templatePool[hashIndex(`${input.playerId}:${input.poi.poiId}:${input.poi.type}:${input.cycle}`, templatePool.length)] ?? templatePool[0];
  if (!template) {
    throw new Error(`camp quest template missing for ${input.poi.type}`);
  }

  const questId = campQuestIdForCycle(input.poi.poiId, input.cycle);

  const quest: LiveGameplayQuestProgress = Object.freeze({
    questId,
    title: `${input.poi.title}: ${template.title}`,
    description: `${template.description} Cycle ${input.cycle}.`,
    npcId: `camp_npc:${input.poi.poiId}`,
    state: "available" as const,
    objectives: Object.freeze([
      Object.freeze({
        objectiveId: `${questId}:deliver`,
        title: template.objectiveTitle,
        current: 0,
        required: template.objectiveRequired,
        completed: false,
      }),
      Object.freeze({
        objectiveId: `${questId}:return`,
        title: `Return to ${input.poi.title}`,
        current: 0,
        required: 1,
        completed: false,
      }),
    ]),
    reward: Object.freeze(template.reward),
  });

  return Object.freeze({
    quest,
    poi: input.poi,
    parsed: Object.freeze({ poiId: input.poi.poiId, cycle: input.cycle }),
    requiredItemId: template.requiredItemId,
    requiredQuantity: template.objectiveRequired,
    rewardSkillId: template.rewardSkillId,
  });
}

function hashIndex(seed: string, modulo: number): number {
  if (modulo <= 1) return 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % modulo;
}
