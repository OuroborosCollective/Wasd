import { describe, expect, it } from "vitest";
import { createResourceGatherIntent } from "./ResourceGatherIntentAdapter";

describe("ResourceGatherIntentAdapter", () => {
  it("rejects missing player position so node position cannot be used as fake self", () => {
    const result = createResourceGatherIntent({
      playerId: "guest",
      nodeId: "starter_tree_001",
      currentTick: 10,
    });

    expect(result).toEqual({ ok: false, reason: "missing_player_position" });
  });

  it("normalizes valid gather intents", () => {
    const result = createResourceGatherIntent({
      playerId: "guest",
      nodeId: "starter_tree_001",
      currentTick: 10.9,
      playerPosition: { x: 460.1234, y: 500.5678 },
    });

    expect(result).toEqual({
      ok: true,
      intent: {
        playerId: "guest",
        nodeId: "starter_tree_001",
        currentTick: 10,
        playerPosition: { x: 460.123, y: 500.568 },
      },
    });
  });

  it("rejects unsafe node identifiers", () => {
    const result = createResourceGatherIntent({
      playerId: "guest",
      nodeId: "../starter_tree_001",
      currentTick: 10,
      playerPosition: { x: 1, y: 1 },
    });

    expect(result).toEqual({ ok: false, reason: "invalid_node_id" });
  });
});
