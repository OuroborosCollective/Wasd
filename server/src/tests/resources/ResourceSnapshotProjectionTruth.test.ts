import { describe, expect, it } from "vitest";
import { ResourceNodeStore } from "../../resources/ResourceNodeStore";
import type { ResourceNodeDefinition } from "../../resources/ResourceTypes";

const NODE: ResourceNodeDefinition = {
  id: "projection_tree_001",
  kind: "tree",
  title: "Projection Tree",
  skillId: "woodcutting",
  requiredLevel: 1,
  xpReward: 10,
  itemRewardId: "wood_log",
  itemRewardName: "Wood Log",
  respawnTicks: 10,
  position: { x: 0, y: 0 },
  radius: 8,
};

describe("Resource snapshot projection truth", () => {
  it("does not register visible chunks or procedural nodes during a read", () => {
    const store = new ResourceNodeStore([NODE], "projection-seed");
    const chunksBefore = store.getRegisteredChunkCount();
    const nodesBefore = store.getTotalNodeCount();

    const snapshots = store.previewVisibleSnapshots(100, { x: 25_000, y: 25_000 });

    expect(snapshots.length).toBeGreaterThan(0);
    expect(store.getRegisteredChunkCount()).toBe(chunksBefore);
    expect(store.getTotalNodeCount()).toBe(nodesBefore);
  });

  it("projects respawn availability without committing the transition", () => {
    const store = new ResourceNodeStore([NODE], "projection-seed");
    const gathered = store.gather({
      playerId: "projection-player",
      nodeId: NODE.id,
      playerPosition: NODE.position,
      currentTick: 5,
      playerSkillLevel: 1,
    });
    expect(gathered.ok).toBe(true);
    const before = store.captureGatherMutationState("projection-player", NODE.id);

    const projected = store.previewVisibleSnapshots(20).find((entry) => entry.id === NODE.id);
    const after = store.captureGatherMutationState("projection-player", NODE.id);

    expect(projected?.status).toBe("available");
    expect(after).toEqual(before);
    expect(after.nodeState?.status).toBe("depleted");
  });
});
