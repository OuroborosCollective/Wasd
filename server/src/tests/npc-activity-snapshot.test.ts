/**
 * Unit Tests for NPC Activity Snapshot System
 * 
 * Tests:
 * 1. Determinism: same input → same output
 * 2. Target Tie-Breaker stability
 * 3. Memory Event bounds
 * 4. Activity resolution correctness
 * 5. Snapshot generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateNPCActivitySnapshot,
  verifySnapshotDeterminism,
  verifyMemoryBounds,
  createActivityContext,
} from "../src/gameplay/NPCActivitySnapshotGenerator.js";
import { globalMemoryEventManager } from "../src/gameplay/BoundedMemoryEvents.js";
import {
  selectStableTarget,
  createTargetCandidate,
  verifyTargetSelectionDeterminism,
  selectAttackTarget,
} from "../src/gameplay/StableTargetSelection.js";
import { resolveActivity } from "../src/gameplay/ActivityResolver.js";
import { getChunkKey } from "../src/gameplay/NPCActivitySnapshot.js";
import type { ActivityResolutionContext } from "../src/gameplay/NPCActivitySnapshot.js";

// ============================================================================
// Determinism Tests
// ============================================================================

describe("NPC Activity Snapshot Determinism", () => {
  beforeEach(() => {
    globalMemoryEventManager.clear();
  });

  it("should produce identical snapshots for same input", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext(
        "npc_1",
        "Blacksmith Karl",
        { x: 100, y: 200 },
        "working",
        0.8,
        0.7,
        1000,
        { workRole: "blacksmith" }
      ),
      createActivityContext(
        "npc_2",
        "Guard Hans",
        { x: 150, y: 250 },
        "patrol",
        0.9,
        0.8,
        1000,
        { workRole: "guard" }
      ),
    ];

    const input = { tick: 1000, entities };

    // Generate multiple times
    const results = [
      generateNPCActivitySnapshot(input),
      generateNPCActivitySnapshot(input),
      generateNPCActivitySnapshot(input),
    ];

    // All should be identical
    for (const result of results) {
      expect(result.serverTick).toBe(1000);
      expect(result.entityCount).toBe(2);
      expect(result.snapshotHash).toBe(results[0]!.snapshotHash);
    }
  });

  it("should verify determinism using built-in verification", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext(
        "npc_test",
        "Test NPC",
        { x: 50, y: 50 },
        "idle",
        0.8,
        0.7,
        500
      ),
    ];

    const input = { tick: 500, entities };
    const isDeterministic = verifySnapshotDeterminism(input, 5);

    expect(isDeterministic).toBe(true);
  });

  it("should sort entries deterministically by chunkKey and entityId", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("npc_c", "NPC C", { x: 200, y: 200 }, "idle", 0.8, 0.7, 100),
      createActivityContext("npc_a", "NPC A", { x: 100, y: 100 }, "idle", 0.8, 0.7, 100),
      createActivityContext("npc_b", "NPC B", { x: 150, y: 150 }, "idle", 0.8, 0.7, 100),
    ];

    const input = { tick: 100, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    // Entries should be sorted by chunkKey first, then entityId
    expect(snapshot.entries[0]!.entityId).toBe("npc_a");
    expect(snapshot.entries[1]!.entityId).toBe("npc_b");
    expect(snapshot.entries[2]!.entityId).toBe("npc_c");
  });
});

// ============================================================================
// Target Selection Tests
// ============================================================================

describe("Stable Target Selection", () => {
  it("should select same target for same candidates", () => {
    const candidates = [
      createTargetCandidate("target_1", { x: 100, y: 100 }, "player", { x: 0, y: 0 }),
      createTargetCandidate("target_2", { x: 50, y: 50 }, "player", { x: 0, y: 0 }),
      createTargetCandidate("target_3", { x: 150, y: 150 }, "player", { x: 0, y: 0 }),
    ];

    const sourcePosition = { x: 0, y: 0 };

    // Select multiple times
    const results = [
      selectStableTarget(candidates, sourcePosition),
      selectStableTarget(candidates, sourcePosition),
      selectStableTarget(candidates, sourcePosition),
    ];

    // All should select same target
    expect(results[0]!.id).toBe("target_2"); // Closest
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(results[0]!.id).toBe(results[2]!.id);
  });

  it("should use stable tie-breaker for equidistant targets", () => {
    // Two targets at exactly same distance
    const candidates = [
      createTargetCandidate("target_a", { x: 100, y: 0 }, "player", { x: 0, y: 0 }),
      createTargetCandidate("target_b", { x: -100, y: 0 }, "player", { x: 0, y: 0 }),
    ];

    const sourcePosition = { x: 0, y: 0 };
    const result = selectStableTarget(candidates, sourcePosition);

    // Should select one deterministically (not random)
    expect(result.id === "target_a" || result.id === "target_b").toBe(true);
    
    // Verify determinism
    const isDeterministic = verifyTargetSelectionDeterminism(candidates, sourcePosition, 10);
    expect(isDeterministic).toBe(true);
  });

  it("should prefer players in attack target selection", () => {
    const candidates = [
      createTargetCandidate("monster_1", { x: 50, y: 50 }, "monster", { x: 0, y: 0 }),
      createTargetCandidate("player_1", { x: 100, y: 100 }, "player", { x: 0, y: 0 }),
      createTargetCandidate("npc_1", { x: 30, y: 30 }, "npc", { x: 0, y: 0 }),
    ];

    const sourcePosition = { x: 0, y: 0 };
    const result = selectAttackTarget(candidates, sourcePosition);

    // Should select player even though farther
    expect(result.id).toBe("player_1");
  });

  it("should return null for empty candidates", () => {
    const result = selectStableTarget([], { x: 0, y: 0 });
    expect(result.id).toBeNull();
    expect(result.distance).toBe(Infinity);
  });
});

// ============================================================================
// Memory Bounds Tests
// ============================================================================

describe("Bounded Memory Events", () => {
  beforeEach(() => {
    globalMemoryEventManager.clear();
  });

  it("should respect max events per NPC limit", () => {
    const entities: ActivityResolutionContext[] = [];
    
    // Create many entities to generate many events
    for (let i = 0; i < 150; i++) {
      entities.push(
        createActivityContext(
          `npc_${i}`,
          `NPC ${i}`,
          { x: i * 10, y: i * 10 },
          "idle",
          0.8,
          0.7,
          1000 + i
        )
      );
    }

    const input = { tick: 1000, entities };
    
    // Generate snapshot (should compact memory)
    generateNPCActivitySnapshot(input);

    // Check memory bounds
    const isWithinBounds = verifyMemoryBounds(input, 100, 5);
    expect(isWithinBounds).toBe(true);
  });

  it("should reject events exceeding per-tick limit", () => {
    globalMemoryEventManager.clear();
    
    const store = globalMemoryEventManager.getStore("test_npc");
    
    // Add many events for same tick
    const addedEvents: number[] = [];
    for (let i = 0; i < 10; i++) {
      const result = store.addEvent("test_npc", 100, "activity_changed", {});
      if (result) addedEvents.push(i);
    }

    // Should only add max 5 events (DEFAULT_MEMORY_BOUNDS.maxEventsPerTick)
    expect(addedEvents.length).toBeLessThanOrEqual(5);
  });

  it("should compact events deterministically", () => {
    const store = globalMemoryEventManager.getStore("compact_test");
    
    // Add events across many ticks
    for (let tick = 0; tick < 200; tick++) {
      store.addEvent("compact_test", tick, "activity_changed", {
        tick,
      });
    }

    // Store should be at or below capacity
    expect(store.getEventCount()).toBeLessThanOrEqual(100);
    
    // Verify compaction kept recent events
    const recentEvents = store.getRecentEvents(50);
    expect(recentEvents.length).toBeGreaterThan(0);
    
    // Verify all events are within bounds
    expect(store.getUtilization()).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Activity Resolution Tests
// ============================================================================

describe("Activity Resolution", () => {
  it("should resolve idle for critical health", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "test",
      entityName: "Test",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "idle",
      health: 0.1, // Critical
      energy: 0.5,
      nearbyThreats: [],
      nearbyTargets: [],
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("idle");
  });

  it("should resolve fleeing when danger is high", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "test",
      entityName: "Test",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "idle",
      health: 0.8,
      energy: 0.7,
      nearbyThreats: [
        { id: "threat_1", position: { x: 10, y: 10 }, threatLevel: 0.8 },
      ],
      nearbyTargets: [],
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("fleeing");
  });

  it("should resolve working for work role NPCs", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "blacksmith",
      entityName: "Blacksmith",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "working",
      health: 0.8,
      energy: 0.7,
      nearbyThreats: [],
      nearbyTargets: [],
      workRole: "blacksmith",
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("working");
  });

  it("should resolve guarding for guard NPCs", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "guard",
      entityName: "Guard",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "patrol",
      health: 0.8,
      energy: 0.7,
      nearbyThreats: [],
      nearbyTargets: [],
      workRole: "guard",
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("guarding");
  });

  it("should resolve attacking for monsters with targets", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "monster",
      entityName: "Wolf",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "hunt",
      health: 0.8,
      energy: 0.7,
      nearbyThreats: [],
      nearbyTargets: [
        { id: "player_1", position: { x: 50, y: 50 }, type: "player" },
      ],
      monsterArchetype: "beast",
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("attacking");
  });

  it("should resolve wandering for idle NPCs with energy", () => {
    const ctx: ActivityResolutionContext = {
      tick: 100,
      entityId: "wanderer",
      entityName: "Wanderer",
      position: { x: 0, y: 0 },
      chunkKey: "0:0",
      brainState: "idle",
      health: 0.8,
      energy: 0.7,
      nearbyThreats: [],
      nearbyTargets: [],
    };

    const result = resolveActivity(ctx);
    expect(result.activity).toBe("wandering");
  });
});

// ============================================================================
// Chunk Key Tests
// ============================================================================

describe("Chunk Key Generation", () => {
  it("should generate correct chunk keys", () => {
    expect(getChunkKey(0, 0)).toBe("0:0");
    expect(getChunkKey(64, 0)).toBe("1:0");
    expect(getChunkKey(0, 64)).toBe("0:1");
    expect(getChunkKey(128, 128)).toBe("2:2");
    expect(getChunkKey(-64, -64)).toBe("-1:-1");
  });

  it("should group entities in same chunk correctly", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("npc_1", "NPC 1", { x: 10, y: 10 }, "idle", 0.8, 0.7, 100),
      createActivityContext("npc_2", "NPC 2", { x: 50, y: 50 }, "idle", 0.8, 0.7, 100),
      createActivityContext("npc_3", "NPC 3", { x: 100, y: 100 }, "idle", 0.8, 0.7, 100),
    ];

    const input = { tick: 100, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    // First two should be in chunk 0:0, third in chunk 1:1
    expect(snapshot.entries[0]!.chunkKey).toBe("0:0");
    expect(snapshot.entries[1]!.chunkKey).toBe("0:0");
    expect(snapshot.entries[2]!.chunkKey).toBe("1:1");
  });
});

// ============================================================================
// Memory Event Generation Tests
// ============================================================================

describe("Memory Event Generation", () => {
  beforeEach(() => {
    globalMemoryEventManager.clear();
  });

  it("should generate activity change events", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("npc_change", "NPC Change", { x: 0, y: 0 }, "idle", 0.8, 0.7, 100),
    ];

    const input = { tick: 100, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    // Should have at least one memory event for initial activity
    expect(snapshot.memoryEvents.length).toBeGreaterThan(0);
    
    // Event should be activity_changed
    const activityEvent = snapshot.memoryEvents.find(e => e.eventType === "activity_changed");
    expect(activityEvent).toBeDefined();
  });

  it("should include tick and entity info in events", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("event_test", "Event Test", { x: 0, y: 0 }, "working", 0.8, 0.7, 500, {
        workRole: "blacksmith"
      }),
    ];

    const input = { tick: 500, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    for (const event of snapshot.memoryEvents) {
      expect(event.entityId).toBe("event_test");
      expect(event.tick).toBe(500);
      expect(event.id).toBeDefined();
    }
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("NPC Activity Snapshot Integration", () => {
  beforeEach(() => {
    globalMemoryEventManager.clear();
  });

  it("should generate valid snapshot with all fields", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("npc_1", "Blacksmith Karl", { x: 100, y: 200 }, "working", 0.8, 0.7, 1000, {
        workRole: "blacksmith"
      }),
      createActivityContext("npc_2", "Guard Hans", { x: 150, y: 250 }, "patrol", 0.9, 0.8, 1000, {
        workRole: "guard"
      }),
      createActivityContext("monster_1", "Wolf", { x: 300, y: 300 }, "hunt", 0.7, 0.6, 1000, {
        monsterArchetype: "beast"
      }),
    ];

    const input = { tick: 1000, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    // Validate snapshot structure
    expect(snapshot.serverTick).toBe(1000);
    expect(snapshot.entityCount).toBe(3);
    expect(snapshot.entries.length).toBe(3);
    expect(snapshot.snapshotHash).toBeDefined();
    expect(snapshot.snapshotHash.length).toBe(8); // 8 hex chars

    // Validate each entry
    for (const entry of snapshot.entries) {
      expect(entry.entityId).toBeDefined();
      expect(entry.name).toBeDefined();
      expect(entry.activity).toBeDefined();
      expect(["idle", "wandering", "working", "guarding", "fleeing", "attacking"]).toContain(entry.activity);
      expect(entry.chunkKey).toBeDefined();
      expect(entry.position).toBeDefined();
      expect(typeof entry.position.x).toBe("number");
      expect(typeof entry.position.y).toBe("number");
      expect(entry.activityHash).toBeDefined();
      expect(entry.sourceTick).toBe(1000);
    }

    // Validate work role entry
    const blacksmith = snapshot.entries.find(e => e.entityId === "npc_1");
    expect(blacksmith?.workRole).toBe("blacksmith");
    expect(blacksmith?.activity).toBe("working");

    // Validate monster entry
    const wolf = snapshot.entries.find(e => e.entityId === "monster_1");
    expect(wolf?.monsterArchetype).toBe("beast");
  });

  it("should handle empty entity list", () => {
    const input = { tick: 100, entities: [] };
    const snapshot = generateNPCActivitySnapshot(input);

    expect(snapshot.serverTick).toBe(100);
    expect(snapshot.entityCount).toBe(0);
    expect(snapshot.entries.length).toBe(0);
    expect(snapshot.memoryEvents.length).toBe(0);
  });

  it("should include memory events in snapshot", () => {
    const entities: ActivityResolutionContext[] = [
      createActivityContext("evt_npc", "Event NPC", { x: 0, y: 0 }, "idle", 0.8, 0.7, 200),
    ];

    const input = { tick: 200, entities };
    const snapshot = generateNPCActivitySnapshot(input);

    // Memory events should be part of snapshot
    expect(snapshot.memoryEvents).toBeDefined();
    expect(Array.isArray(snapshot.memoryEvents)).toBe(true);
  });
});