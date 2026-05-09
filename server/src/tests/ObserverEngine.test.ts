import { describe, it, expect, beforeEach } from "vitest";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";

describe("ObserverEngine", () => {
  let engine: ObserverEngine;

  beforeEach(() => {
    engine = new ObserverEngine();
  });

  it("should start with no observed chunks", () => {
    expect(engine.getObservedChunks().chunks).toHaveLength(0);
  });

  it("should register a player and calculate their observed chunks", () => {
    engine.register("player1", { x: 0, y: 0 });
    const { chunks } = engine.getObservedChunks();

    // 5x5 grid = 25 chunks
    expect(chunks).toHaveLength(25);

    // The chunks around (0,0) which is chunk (0,0)
    // Should be -2:-2 to 2:2
    const expectedIds = [
      "-2:-2", "-1:-2", "0:-2", "1:-2", "2:-2",
      "-2:-1", "-1:-1", "0:-1", "1:-1", "2:-1",
      "-2:0", "-1:0", "0:0", "1:0", "2:0",
      "-2:1", "-1:1", "0:1", "1:1", "2:1",
      "-2:2", "-1:2", "0:2", "1:2", "2:2"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });

  it("should unregister a player", () => {
    engine.register("player1", { x: 0, y: 0 });
    engine.unregister("player1");
    expect(engine.getObservedChunks().chunks).toHaveLength(0);
  });

  it("should update a player's position", () => {
    engine.register("player1", { x: 0, y: 0 });
    // Move to next chunk to the right (chunk x: 1, y: 0)
    engine.updatePosition("player1", { x: 65, y: 0 });

    const { chunks } = engine.getObservedChunks();
    expect(chunks).toHaveLength(25);

    // Now centered around chunk (1,0)
    // Chunks should be -1:-2 to 3:2
    const expectedIds = [
      "-1:-2", "0:-2", "1:-2", "2:-2", "3:-2",
      "-1:-1", "0:-1", "1:-1", "2:-1", "3:-1",
      "-1:0", "0:0", "1:0", "2:0", "3:0",
      "-1:1", "0:1", "1:1", "2:1", "3:1",
      "-1:2", "0:2", "1:2", "2:2", "3:2"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });

  it("should ignore position updates for unregistered players", () => {
    engine.updatePosition("unregistered", { x: 0, y: 0 });
    expect(engine.getObservedChunks().chunks).toHaveLength(0);
  });

  it("should merge overlapping chunks for multiple players", () => {
    // Player 1 at chunk (0,0) -> observes -2 to 2
    engine.register("player1", { x: 0, y: 0 });
    // Player 2 at chunk (4,0) -> observes 2 to 6
    engine.register("player2", { x: 256, y: 0 });

    const { chunks } = engine.getObservedChunks();

    // Player 1: x in [-2, -1, 0, 1, 2]
    // Player 2: x in [2, 3, 4, 5, 6]
    // Overlap at x=2
    // Total x values = 9 (-2, -1, 0, 1, 2, 3, 4, 5, 6)
    // y values = 5 (-2, -1, 0, 1, 2)
    // Total chunks = 9 * 5 = 45
    expect(chunks).toHaveLength(45);
  });

  it("should correctly calculate chunks with negative coordinates", () => {
    engine.register("player1", { x: -65, y: -65 });

    const { chunks } = engine.getObservedChunks();
    expect(chunks).toHaveLength(25);

    // -65 / 64 = -1.015625 -> Math.floor -> -2
    // Centered around chunk (-2, -2)
    // Range -4 to 0
    const expectedIds = [
      "-4:-4", "-3:-4", "-2:-4", "-1:-4", "0:-4",
      "-4:-3", "-3:-3", "-2:-3", "-1:-3", "0:-3",
      "-4:-2", "-3:-2", "-2:-2", "-1:-2", "0:-2",
      "-4:-1", "-3:-1", "-2:-1", "-1:-1", "0:-1",
      "-4:0", "-3:0", "-2:0", "-1:0", "0:0"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });
});
