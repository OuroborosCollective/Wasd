import { describe, it, expect, vi } from "vitest";
import { WorldTick } from "../core/WorldTick.js";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { performance } from "node:perf_hooks";

describe("WorldTick.broadcastState Benchmark", () => {
  it("measures broadcastState performance", async () => {
    const mockWs = {
      broadcast: vi.fn(),
      sendToPlayer: vi.fn(),
      onPlayerConnect: null,
      onPlayerDisconnect: null,
      onPlayerMessage: null,
      setEntitySyncIntervalForSocket: vi.fn(),
    } as unknown as GameWebSocketServer;

    // Mock PersistenceManager to avoid DB connections
    vi.mock("../core/PersistenceManager.js", () => {
      return {
        PersistenceManager: vi.fn().mockImplementation(() => ({
          init: vi.fn().mockResolvedValue(undefined),
          testConnection: vi.fn().mockResolvedValue(true),
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(undefined),
          loadWorldObjects: vi.fn().mockResolvedValue([]),
          saveWorldObjects: vi.fn().mockResolvedValue(undefined),
          getDriverName: vi.fn().mockReturnValue("mock"),
        })),
      };
    });

    const worldTick = new WorldTick(mockWs);
    // Minimal init without full async overhead if possible, or just await it
    await worldTick.init();

    // Add 1000 NPCs spread across the world
    for (let i = 0; i < 1000; i++) {
      worldTick.npcSystem.createNPC(`npc_${i}`, `NPC ${i}`, Math.random() * 2000, Math.random() * 2000);
    }

    // Add 1000 Loot entities
    const lootEntities = (worldTick as any).lootEntities;
    for (let i = 0; i < 1000; i++) {
      lootEntities.set(`loot_${i}`, {
        id: `loot_${i}`,
        position: { x: Math.random() * 2000, y: Math.random() * 2000 },
        items: [{ id: "gold", quantity: 10 }]
      });
    }

    // Add 100 World Objects
    if (worldTick.worldSystem.objectSystem) {
        for (let i = 0; i < 100; i++) {
            await worldTick.worldSystem.objectSystem.addObject({
                id: `obj_${i}`,
                type: "tree",
                name: `Tree ${i}`,
                position: { x: Math.random() * 2000, y: Math.random() * 2000 }
            });
        }
    }

    // Register a few players to have observed chunks
    for (let i = 0; i < 5; i++) {
        const playerId = `player_${i}`;
        const socketId = `socket_${i}`;
        worldTick.playerSystem.createPlayer(playerId, `Player ${i}`);
        worldTick.observerEngine.register(socketId, { x: 500 + i * 100, y: 500 + i * 100 });
        (worldTick as any).socketToPlayer.set(socketId, playerId);
        (worldTick as any).playerToSocket.set(playerId, socketId);
    }

    const observedChunks = worldTick.observerEngine.getObservedChunks();
    const observedChunkIds = new Set(observedChunks.map((c) => c.id));

    // Warm up
    for (let i = 0; i < 10; i++) {
      worldTick.broadcastState(observedChunkIds);
    }

    const start = performance.now();
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      worldTick.broadcastState(observedChunkIds);
    }
    const end = performance.now();
    const avg = (end - start) / iterations;

    console.log(`\n[BENCHMARK] Average broadcastState time: ${avg.toFixed(4)}ms for 2100+ entities`);

    // We expect it to be reasonably fast even before optimization, but we want to see it drop.
    expect(avg).toBeLessThan(200);
  });
});
