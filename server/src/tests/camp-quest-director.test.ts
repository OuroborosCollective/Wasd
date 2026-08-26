import { describe, expect, it } from "vitest";
import {
  CAMP_QUEST_CYCLE_TICKS,
  campQuestIdFor,
  generateCampQuestOffers,
  getCampQuestCycle,
  isGatheringCampPoiType,
  type CampQuestPoi,
} from "../quests/CampQuestDirector.js";

const POIS: readonly CampQuestPoi[] = Object.freeze([
  Object.freeze({
    poiId: "logging_001",
    type: "logging_camp",
    title: "North Logging Camp",
    x: 100,
    y: 200,
    chunkX: 1,
    chunkZ: 2,
  }),
  Object.freeze({
    poiId: "mining_001",
    type: "mining_camp",
    title: "Copper Ridge Mine",
    x: 300,
    y: 400,
    chunkX: 3,
    chunkZ: 4,
  }),
  Object.freeze({
    poiId: "ruin_001",
    type: "ancient_ruin",
    title: "Old Ruin",
    x: 500,
    y: 600,
    chunkX: 5,
    chunkZ: 6,
  }),
]);

describe("CampQuestDirector", () => {
  it("recognizes only gathering camp POI types", () => {
    expect(isGatheringCampPoiType("logging_camp")).toBe(true);
    expect(isGatheringCampPoiType("mining_camp")).toBe(true);
    expect(isGatheringCampPoiType("fishing_camp")).toBe(true);
    expect(isGatheringCampPoiType("ancient_ruin")).toBe(false);
  });

  it("uses deterministic 10Hz quest cycles", () => {
    expect(getCampQuestCycle(0)).toBe(0);
    expect(getCampQuestCycle(CAMP_QUEST_CYCLE_TICKS - 1)).toBe(0);
    expect(getCampQuestCycle(CAMP_QUEST_CYCLE_TICKS)).toBe(1);
    expect(getCampQuestCycle(-1)).toBe(0);
    expect(campQuestIdFor("logging_001", CAMP_QUEST_CYCLE_TICKS)).toBe("camp_daily:logging_001:1");
  });

  it("does not offer quests for undiscovered camps", () => {
    const offers = generateCampQuestOffers({
      playerId: "player_001",
      logicalIndex: 42,
      worldPois: POIS,
      discoveredPoiIds: [],
    });

    expect(offers).toHaveLength(0);
  });

  it("offers deterministic quests only for discovered gathering camps", () => {
    const input = {
      playerId: "player_001",
      logicalIndex: 42,
      worldPois: POIS,
      discoveredPoiIds: ["logging_001", "ruin_001"],
    };

    const first = generateCampQuestOffers(input);
    const second = generateCampQuestOffers(input);

    expect(first).toEqual(second);
    expect(first).toHaveLength(1);
    expect(first[0]?.questId).toBe("camp_daily:logging_001:0");
    expect(first[0]?.state).toBe("available");
    expect(first[0]?.npcId).toBe("camp_npc:logging_001");
    expect(first[0]?.objectives).toHaveLength(2);
    expect(first[0]?.reward?.coins).toBeGreaterThan(0);
  });

  it("changes quest id when the cycle changes", () => {
    const cycleZero = generateCampQuestOffers({
      playerId: "player_001",
      logicalIndex: 0,
      worldPois: POIS,
      discoveredPoiIds: ["logging_001"],
    });
    const cycleOne = generateCampQuestOffers({
      playerId: "player_001",
      logicalIndex: CAMP_QUEST_CYCLE_TICKS,
      worldPois: POIS,
      discoveredPoiIds: ["logging_001"],
    });

    expect(cycleZero[0]?.questId).toBe("camp_daily:logging_001:0");
    expect(cycleOne[0]?.questId).toBe("camp_daily:logging_001:1");
  });

  it("suppresses completed cycle quest ids", () => {
    const offers = generateCampQuestOffers({
      playerId: "player_001",
      logicalIndex: 0,
      worldPois: POIS,
      discoveredPoiIds: ["logging_001", "mining_001"],
      completedQuestIds: ["camp_daily:logging_001:0"],
    });

    expect(offers.map((q) => q.questId)).toEqual(["camp_daily:mining_001:0"]);
  });
});
