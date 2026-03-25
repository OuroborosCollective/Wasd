import { describe, it, expect, beforeEach } from "vitest";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";

describe("ObserverEngine", () => {
  let engine: ObserverEngine;

  beforeEach(() => {
    engine = new ObserverEngine();
  });

  it("should start with no observed chunks", () => {
    expect(engine.getObservedChunks()).toHaveLength(0);
  });

  it("should register a player and calculate their observed chunks", () => {
    engine.register("player1", { x: 0, y: 0 });
    const chunks = engine.getObservedChunks();

    // 3x3 grid = 9 chunks
    expect(chunks).toHaveLength(9);

    // The chunks around (0,0) which is chunk (0,0)
    // Should be -1: -1 to 1:1
    const expectedIds = [
      "-1:-1", "0:-1", "1:-1",
      "-1:0", "0:0", "1:0",
      "-1:1", "0:1", "1:1"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });

  it("should unregister a player", () => {
    engine.register("player1", { x: 0, y: 0 });
    engine.unregister("player1");
    expect(engine.getObservedChunks()).toHaveLength(0);
  });

  it("should update a player's position", () => {
    engine.register("player1", { x: 0, y: 0 });
    // Move to next chunk to the right (chunk x: 1, y: 0)
    engine.updatePosition("player1", { x: 65, y: 0 });

    const chunks = engine.getObservedChunks();
    expect(chunks).toHaveLength(9);

    // Now centered around chunk (1,0)
    // Chunks should be 0:-1 to 2:1
    const expectedIds = [
      "0:-1", "1:-1", "2:-1",
      "0:0", "1:0", "2:0",
      "0:1", "1:1", "2:1"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });

  it("should ignore position updates for unregistered players", () => {
    engine.updatePosition("unregistered", { x: 0, y: 0 });
    expect(engine.getObservedChunks()).toHaveLength(0);
  });

  it("should merge overlapping chunks for multiple players", () => {
    // Player 1 at chunk (0,0) -> observes -1 to 1
    engine.register("player1", { x: 0, y: 0 });
    // Player 2 at chunk (2,0) -> observes 1 to 3
    engine.register("player2", { x: 128, y: 0 });

    const chunks = engine.getObservedChunks();

    // Player 1: x in [-1, 0, 1]
    // Player 2: x in [1, 2, 3]
    // Overlap at x=1
    // Total x values = 5 (-1, 0, 1, 2, 3)
    // y values = 3 (-1, 0, 1)
    // Total chunks = 5 * 3 = 15
    expect(chunks).toHaveLength(15);
  });

  it("should correctly calculate chunks with negative coordinates", () => {
    engine.register("player1", { x: -65, y: -65 });

    const chunks = engine.getObservedChunks();
    expect(chunks).toHaveLength(9);

    // -65 / 64 = -1.015625 -> Math.floor -> -2
    // Centered around chunk (-2, -2)
    const expectedIds = [
      "-3:-3", "-2:-3", "-1:-3",
      "-3:-2", "-2:-2", "-1:-2",
      "-3:-1", "-2:-1", "-1:-1"
    ];

    const chunkIds = chunks.map(c => c.id);
    for (const id of expectedIds) {
      expect(chunkIds).toContain(id);
    }
  });
});
