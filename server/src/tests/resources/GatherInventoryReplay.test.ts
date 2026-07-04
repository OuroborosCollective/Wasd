import { describe, expect, it } from "vitest";
import { InventoryStore } from "../../inventory/InventoryStore";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
} from "../../intents/ServerCanonicalIntent";
import { ResourceNodeStore } from "../../resources/ResourceNodeStore";
import type { ResourceNodeDefinition } from "../../resources/ResourceTypes";

const TREE_NODE: ResourceNodeDefinition = {
  id: "replay_tree_001",
  kind: "tree",
  title: "Replay Tree",
  skillId: "woodcutting",
  requiredLevel: 1,
  xpReward: 10,
  itemRewardId: "wood_log",
  itemRewardName: "Wood Log",
  respawnTicks: 100,
  position: { x: 10, y: 5 },
  radius: 8,
};

function stableSnapshot(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function runGatherInventoryReplay() {
  const playerId = "replay-player";
  const currentTick = 144;
  const playerPosition = { x: 10, y: 5 };
  const canonicalIntent = canonicalizeClientIntent<"gather">(
    {
      action: "gather",
      requestId: "req:gather:replay",
      payload: {
        nodeId: TREE_NODE.id,
        playerPosition,
      },
    },
    {
      actorId: playerId,
      tickId: currentTick,
      logicalIndex: currentTick,
      receivedOrder: 0,
      chunkKey: chunkKeyFromWorldPosition(playerPosition),
    },
  );

  const nodes = new ResourceNodeStore([TREE_NODE]);
  const inventory = new InventoryStore();
  const gatherResult = nodes.gather({
    playerId: canonicalIntent.actorId,
    nodeId: canonicalIntent.payload.nodeId,
    playerPosition: canonicalIntent.payload.playerPosition,
    currentTick,
    playerSkillLevel: 1,
  });

  expect(gatherResult.ok).toBe(true);
  expect(gatherResult.itemRewardId).toBe("wood_log");

  const inventoryDelta = inventory.addItem({
    playerId: canonicalIntent.actorId,
    itemId: gatherResult.itemRewardId ?? "wood_log",
    quantity: 1,
    origin: {
      uid: canonicalIntent.intentHash,
      tick: currentTick,
      source: "gather_delta",
      sourceHash: canonicalIntent.intentHash,
    },
  });

  expect(inventoryDelta.ok).toBe(true);

  return {
    canonicalIntent,
    gatherResult: {
      ok: gatherResult.ok,
      playerId: gatherResult.playerId,
      nodeId: gatherResult.nodeId,
      reason: gatherResult.reason,
      itemRewardId: gatherResult.itemRewardId,
      itemRewardName: gatherResult.itemRewardName,
      snapshot: gatherResult.snapshot,
    },
    inventory: inventory.getPlayerInventory(playerId),
    movementEvents: inventory.getMovementEvents(playerId),
  };
}

describe("Gather to inventory replay", () => {
  it("replays the same canonical gather delta into the same inventory state", () => {
    const first = runGatherInventoryReplay();
    const second = runGatherInventoryReplay();

    expect(first).toEqual(second);
    expect(first.inventory.slots).toEqual([
      expect.objectContaining({
        itemId: "wood_log",
        name: "Wood Log",
        quantity: 1,
        category: "resource",
      }),
    ]);
    expect(first.movementEvents).toHaveLength(1);
    expect(first.movementEvents[0]?.origin).toEqual({
      uid: first.canonicalIntent.intentHash,
      tick: first.canonicalIntent.logicalIndex,
      source: "gather_delta",
      sourceHash: first.canonicalIntent.intentHash,
    });
    expect(stableSnapshot(first)).toBe(stableSnapshot(second));
  });
});
