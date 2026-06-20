/**
 * Deterministic camp quest offer generation for discovered gathering camps.
 * Emits snapshot offers only; accept and reward mutation stay in server action paths.
 */

import type { LiveGameplayQuestProgress, LiveGameplayQuestReward } from "../gameplay/LiveGameplaySnapshotTypes.js";

export const CAMP_QUEST_CYCLE_TICKS = 10 * 60 * 30;

export type GatheringCampPoiType = "logging_camp" | "mining_camp" | "fishing_camp";
export type CampQuestDeliveryItemId = "wood_log" | "copper_ore" | "raw_fish";

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

export interface CampQuestRequirement {
  readonly itemId: CampQuestDeliveryItemId;
  readonly quantity: number;
}

export interface CampQuestResolutionInput {
  readonly playerId: string;
  readonly poiId: string;
  readonly poiType: GatheringCampPoiType;
  readonly logicalIndex: number;
}

export interface GenerateCampQuestOffersInput {
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly worldPois: readonly CampQuestPoi[];
  readonly discoveredPoiIds: readonly string[];
  readonly completedQuestIds?: readonly string[];
}

interface CampQuestTemplate {
  readonly title: string;
  readonly description: string;
  readonly objectiveTitle: string;
  readonly requirement: CampQuestRequirement;
  readonly reward: LiveGameplayQuestReward;
}

const TEMPLATES: Record<GatheringCampPoiType, readonly CampQuestTemplate[]> = Object.freeze({
  logging_camp: Object.freeze([
    {
      title: "Wood Delivery",
      description: "The logging crew needs a fresh wood-log delivery before the next hauling run.",
      objectiveTitle: "Deliver 6 Wood Logs to the camp",
      requirement: { itemId: "wood_log", quantity: 6 },
      reward: { coins: 18, gatheringXp: 30, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Tool Handle Supply",
      description: "The foreman needs backup handles before production dips.",
      objectiveTitle: "Deliver 3 Wood Logs for tool handles",
      requirement: { itemId: "wood_log", quantity: 3 },
      reward: { coins: 12, gatheringXp: 20, craftingXp: 5, reputation: 1 },
    },
  ]),
  mining_camp: Object.freeze([
    {
      title: "Ore Sample Run",
      description: "The miners need a clean ore sample logged for the next smelting batch.",
      objectiveTitle: "Deliver 5 Copper Ore to the camp",
      requirement: { itemId: "copper_ore", quantity: 5 },
      reward: { coins: 22, gatheringXp: 34, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Spare Ore Count",
      description: "The mining crew needs backup copper counted before the next work cycle.",
      objectiveTitle: "Deliver 3 Copper Ore to the camp",
      requirement: { itemId: "copper_ore", quantity: 3 },
      reward: { coins: 16, gatheringXp: 24, craftingXp: 4, reputation: 1 },
    },
  ]),
  fishing_camp: Object.freeze([
    {
      title: "Fresh Catch Order",
      description: "The fishing camp needs a fresh catch counted before the next trader leaves.",
      objectiveTitle: "Deliver 5 Raw Fish to the camp",
      requirement: { itemId: "raw_fish", quantity: 5 },
      reward: { coins: 20, gatheringXp: 32, craftingXp: 0, reputation: 1 },
    },
    {
      title: "Ration Check",
      description: "The net crew needs small catches inspected after the last tide cycle.",
      objectiveTitle: "Deliver 3 Raw Fish for camp rationing",
      requirement: { itemId: "raw_fish", quantity: 3 },
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

export function getCampQuestCycle(logicalIndex: number): number {
  const safeTick = Number.isSafeInteger(logicalIndex) && logicalIndex >= 0 ? logicalIndex : 0;
  return Math.floor(safeTick / CAMP_QUEST_CYCLE_TICKS);
}

export function campQuestIdFor(poiId: string, logicalIndex: number): string {
  return `camp_daily:${poiId}:${getCampQuestCycle(logicalIndex)}`;
}

function resolveCampQuestTemplate(input: CampQuestResolutionInput): CampQuestTemplate {
  const templatePool = TEMPLATES[input.poiType];
  const cycle = getCampQuestCycle(input.logicalIndex);
  return templatePool[hashIndex(`${input.playerId.trim()}:${input.poiId}:${input.poiType}:${cycle}`, templatePool.length)];
}

export function resolveCampQuestRequirement(input: CampQuestResolutionInput): CampQuestRequirement {
  const template = resolveCampQuestTemplate(input);
  return Object.freeze({ ...template.requirement });
}

export function resolveCampQuestReward(input: CampQuestResolutionInput): LiveGameplayQuestReward {
  const template = resolveCampQuestTemplate(input);
  return Object.freeze({ ...template.reward });
}

export function generateCampQuestOffers(input: GenerateCampQuestOffersInput): readonly LiveGameplayQuestProgress[] {
  const playerId = input.playerId.trim();
  if (!playerId) return Object.freeze([]);

  const cycle = getCampQuestCycle(input.logicalIndex);
  const discovered = new Set(input.discoveredPoiIds.filter(Boolean));
  const completed = new Set(input.completedQuestIds ?? []);

  const offers = input.worldPois
    .filter((poi): poi is GatheringCampQuestPoi => isDiscoveredGatheringCampPoi(poi, discovered))
    .sort((a, b) => a.poiId.localeCompare(b.poiId))
    .map((poi): LiveGameplayQuestProgress | null => {
      const questId = `camp_daily:${poi.poiId}:${cycle}`;
      if (completed.has(questId)) return null;

      const template = resolveCampQuestTemplate({ playerId, poiId: poi.poiId, poiType: poi.type, logicalIndex: input.logicalIndex });

      return Object.freeze({
        questId,
        title: `${poi.title}: ${template.title}`,
        description: `${template.description} Cycle ${cycle}.`,
        npcId: `camp_npc:${poi.poiId}`,
        state: "available" as const,
        objectives: Object.freeze([
          Object.freeze({
            objectiveId: `${questId}:deliver`,
            title: template.objectiveTitle,
            current: 0,
            required: template.requirement.quantity,
            completed: false,
          }),
          Object.freeze({
            objectiveId: `${questId}:return`,
            title: `Return to ${poi.title}`,
            current: 0,
            required: 1,
            completed: false,
          }),
        ]),
        reward: Object.freeze(template.reward),
      });
    })
    .filter((quest): quest is LiveGameplayQuestProgress => quest !== null)
    .sort((a, b) => a.questId.localeCompare(b.questId));

  return Object.freeze(offers);
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
