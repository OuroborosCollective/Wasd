import { describe, expect, it } from "vitest";
import { GameplayFusionDirector } from "../modules/gameplay/GameplayFusionDirector.js";

describe("GameplayFusionDirector", () => {
  it("syncs needs and handles assignment/completion", async () => {
    const director = new GameplayFusionDirector(() => "/assets/models/world-assets/props/default.glb");
    const now = Date.now();
    director.syncModelNeeds(
      [
        {
          id: "need:road_left",
          kind: "logical_model",
          category: "world_objects",
          descriptionDe: "Road left",
          reasonDe: "needed",
          suggestedFileName: "road_left.glb",
          suggestedFolder: "world-assets/props",
          suggestedRelativePath: "world-assets/props/road_left.glb",
          suggestedUrlPath: "/assets/models/world-assets/props/road_left.glb",
          targetType: "object_group",
          targetId: "road_left",
          source: null,
          status: "needed",
          satisfiedBy: null,
        } as any,
      ],
      [],
      now,
    );
    const contracts = director.getConstructionContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0]?.status).toBe("available");

    const assigned = director.assignContractToNpc(contracts[0]!.id, "npc_builder", now);
    expect(assigned).toBe(true);
    expect(director.getConstructionContracts()[0]?.status).toBe("in_progress");

    const added: any[] = [];
    await director.completeContract(contracts[0]!.id, {
      completedByNpcId: "npc_builder",
      worldObjectSystem: {
        addObject: async (obj: any) => {
          added.push(obj);
        },
      },
    }, now);
    expect(director.getConstructionContracts()[0]?.status).toBe("completed");
    expect(added.length).toBe(1);
    expect(String(added[0]?.glbPath || "")).toContain("road_left");
  });

  it("creates quest echoes and adaptive overrides from player quests", () => {
    const director = new GameplayFusionDirector(() => "/assets/models/world-assets/props/default.glb");
    const now = Date.now();
    const npcs = [
      { id: "npc_guide", role: "Guide", name: "Guide", position: { x: 10, y: 8 } },
    ];
    const players = [
      { id: "p1", position: { x: 0, y: 0 }, quests: [{ id: "q1", objectiveType: "talk_to", targetNpcId: "npc_guide", completed: false }] },
    ];

    director.tick({
      now,
      npcs,
      players,
      getQuestSyncForClient: (player: any) => player.quests || [],
      npcMemoryCache: null,
      emitNpcThinking: () => {},
    });

    const beacons = director.getQuestEchoBeacons(now + 1);
    expect(beacons.length).toBeGreaterThan(0);
    expect(beacons[0]?.npcId).toBe("npc_guide");

    const override = director.resolveNpcGlbOverride(npcs[0], now + 1);
    expect(typeof override === "string" || typeof override === "undefined").toBe(true);
  });
});
