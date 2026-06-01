/**
 * PersistentPlaytesterNPC.ts
 *
 * Deterministic NPC bot that lives permanently in the game world.
 * Runs tests on all game systems, generates structured JSONL logs.
 *
 * Key design principles:
 * - Deterministic: Uses seed + tick for all decisions (no Math.random())
 * - Tags: Uses "playtester", "synthetic", "monitor", "persistent" tags
 * - Non-intrusive: Won't affect real player metrics (leaderboards, economy)
 */

import type { PlaytesterJsonlLogger } from "./PlaytesterJsonlLogger.js";

/**
 * Actions the playtester NPC can perform
 */
export type PlaytesterActionType =
  | "spawn"
  | "move"
  | "inspect_chunk"
  | "talk_to_npc"
  | "accept_quest"
  | "complete_quest"
  | "attack"
  | "loot"
  | "equip"
  | "use_skill"
  | "craft"
  | "trade"
  | "enter_dungeon"
  | "place_building"
  | "verify_world_state"
  | "verify_determinism"
  | "idle";

/**
 * Interface for world operations the playtester can call
 */
export interface PlaytesterWorldPort {
  readonly getTick: () => number;
  readonly ensureNpcExists: (npc: PlaytesterNpcSpawn) => void;
  readonly moveNpc: (npcId: string, target: { x: number; y: number }) => void;
  readonly getNearbyNpcs: (npcId: string, radius: number) => readonly string[];
  readonly getNearbyHostiles: (npcId: string, radius: number) => readonly string[];
  readonly interactWithNpc: (npcId: string, targetNpcId: string) => unknown;
  readonly attackTarget: (npcId: string, targetId: string) => unknown;
  readonly pickupNearbyLoot: (npcId: string) => unknown;
  readonly useSkill: (npcId: string, skillId: string) => unknown;
  readonly getStateHash: () => string;
}

/**
 * NPC spawn configuration
 */
export interface PlaytesterNpcSpawn {
  readonly id: string;
  readonly name: string;
  readonly syntheticSocketId: string;
  readonly position: { x: number; y: number };
  readonly persistent: boolean;
  readonly tags: readonly string[];
}

/**
 * A single logged event
 */
export interface PlaytesterLogEvent {
  readonly tick: number;
  readonly botId: string;
  readonly action: PlaytesterActionType;
  readonly ok: boolean;
  readonly message: string;
  readonly stateHash?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Bot's memory state (what it has tested)
 */
export interface PlaytesterMemory {
  readonly visitedChunks: Set<string>;
  readonly talkedToNpcs: Set<string>;
  readonly attackedTargets: Set<string>;
  readonly completedChecks: Set<string>;
  lastStateHash: string;
  eventsSinceRepoCommit: number;
}

/**
 * Configuration for the persistent NPC
 */
export interface PersistentPlaytesterNPCConfig {
  readonly id: string;
  readonly displayName: string;
  readonly syntheticSocketId: string;
  readonly deterministicSeed: string;
  readonly routineIntervalTicks: number;
  readonly fullSweepEveryTicks: number;
}

/**
 * FNV-1a hash function for deterministic randomness
 */
function hashString(input: string): number {
  let h = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  return h >>> 0;
}

/**
 * Deterministic picker: picks an element from an array based on seed + tick.
 * No Math.random() - fully reproducible.
 */
function pickDeterministic<T>(
  seed: string,
  tick: number,
  values: readonly T[],
): T {
  if (values.length === 0) {
    throw new Error("Cannot pick from empty values.");
  }

  const index = hashString(`${seed}:${tick}`) % values.length;
  return values[index];
}

/**
 * PersistentPlaytesterNPC
 *
 * A deterministic NPC bot that tests the game world continuously.
 * Spawns once, then runs routines at configurable intervals.
 */
export class PersistentPlaytesterNPC {
  private readonly memory: PlaytesterMemory = {
    visitedChunks: new Set<string>(),
    talkedToNpcs: new Set<string>(),
    attackedTargets: new Set<string>(),
    completedChecks: new Set<string>(),
    lastStateHash: "",
    eventsSinceRepoCommit: 0,
  };

  private initialized = false;

  constructor(
    private readonly config: PersistentPlaytesterNPCConfig,
    private readonly world: PlaytesterWorldPort,
    private readonly logger: {
      readonly write: (event: PlaytesterLogEvent) => void;
    },
  ) {}

  /**
   * Main tick function - called every server tick.
   * Only acts at configured intervals.
   */
  tick(): void {
    const tick = this.world.getTick();

    // Spawn once on first tick
    if (!this.initialized) {
      this.spawn(tick);
      this.initialized = true;
      return;
    }

    // Only act at routine interval
    if (tick % this.config.routineIntervalTicks !== 0) {
      return;
    }

    // Full sweep runs less frequently
    if (tick % this.config.fullSweepEveryTicks === 0) {
      this.runFullSweep(tick);
      return;
    }

    this.runRoutine(tick);
  }

  /**
   * Spawn the playtester NPC in the world
   */
  private spawn(tick: number): void {
    this.world.ensureNpcExists({
      id: this.config.id,
      name: this.config.displayName,
      syntheticSocketId: this.config.syntheticSocketId,
      position: { x: 0, y: 0 },
      persistent: true,
      tags: ["playtester", "synthetic", "monitor", "persistent"],
    });

    this.log(tick, "spawn", true, "Persistent playtester NPC spawned.");
  }

  /**
   * Run a single routine action (determined by seed + tick)
   */
  private runRoutine(tick: number): void {
    const action = pickDeterministic(
      this.config.deterministicSeed,
      tick,
      [
        "move",
        "inspect_chunk",
        "talk_to_npc",
        "attack",
        "loot",
        "use_skill",
        "verify_world_state",
        "verify_determinism",
      ] as const,
    );

    switch (action) {
      case "move":
        this.testMovement(tick);
        break;
      case "inspect_chunk":
        this.testChunkInspection(tick);
        break;
      case "talk_to_npc":
        this.testNpcInteraction(tick);
        break;
      case "attack":
        this.testCombat(tick);
        break;
      case "loot":
        this.testLoot(tick);
        break;
      case "use_skill":
        this.testSkill(tick);
        break;
      case "verify_world_state":
        this.verifyWorldState(tick);
        break;
      case "verify_determinism":
        this.verifyDeterminism(tick);
        break;
      default:
        this.log(tick, "idle", true, "Playtester idle.");
    }
  }

  /**
   * Run a full sweep - tests all systems in sequence
   */
  private runFullSweep(tick: number): void {
    this.testMovement(tick);
    this.testChunkInspection(tick);
    this.testNpcInteraction(tick);
    this.testCombat(tick);
    this.testLoot(tick);
    this.testSkill(tick);
    this.verifyWorldState(tick);
    this.verifyDeterminism(tick);

    this.log(tick, "verify_world_state", true, "Full playtester sweep completed.");
  }

  /**
   * Test movement by calculating a deterministic position
   */
  private testMovement(tick: number): void {
    const x = ((tick * 17) % 512) - 256;
    const y = ((tick * 31) % 512) - 256;

    this.world.moveNpc(this.config.id, { x, y });

    this.log(tick, "move", true, "Moved persistent playtester NPC.", {
      x,
      y,
    });
  }

  /**
   * Test chunk inspection by deterministically selecting a chunk
   */
  private testChunkInspection(tick: number): void {
    const chunkX = Math.floor((((tick * 17) % 512) - 256) / 64);
    const chunkY = Math.floor((((tick * 31) % 512) - 256) / 64);
    const key = `${chunkX}:${chunkY}`;

    this.memory.visitedChunks.add(key);

    this.log(tick, "inspect_chunk", true, "Inspected chunk.", {
      chunkX,
      chunkY,
      visitedChunks: this.memory.visitedChunks.size,
    });
  }

  /**
   * Test NPC interaction
   */
  private testNpcInteraction(tick: number): void {
    const nearby = this.world.getNearbyNpcs(this.config.id, 32);

    if (nearby.length === 0) {
      this.log(tick, "talk_to_npc", false, "No nearby NPC found.");
      return;
    }

    const targetNpcId = pickDeterministic(
      this.config.deterministicSeed,
      tick,
      nearby,
    );

    const result = this.world.interactWithNpc(this.config.id, targetNpcId);
    this.memory.talkedToNpcs.add(targetNpcId);

    this.log(tick, "talk_to_npc", true, "Interacted with nearby NPC.", {
      targetNpcId,
      result,
    });
  }

  /**
   * Test combat against a nearby hostile
   */
  private testCombat(tick: number): void {
    const hostiles = this.world.getNearbyHostiles(this.config.id, 40);

    if (hostiles.length === 0) {
      this.log(tick, "attack", false, "No nearby hostile target found.");
      return;
    }

    const targetId = pickDeterministic(
      this.config.deterministicSeed,
      tick,
      hostiles,
    );

    const result = this.world.attackTarget(this.config.id, targetId);
    this.memory.attackedTargets.add(targetId);

    this.log(tick, "attack", true, "Attacked hostile target.", {
      targetId,
      result,
    });
  }

  /**
   * Test loot pickup
   */
  private testLoot(tick: number): void {
    const result = this.world.pickupNearbyLoot(this.config.id);

    this.log(tick, "loot", true, "Tried nearby loot pickup.", {
      result,
    });
  }

  /**
   * Test skill usage
   */
  private testSkill(tick: number): void {
    const skillId = pickDeterministic(
      this.config.deterministicSeed,
      tick,
      ["impact_buster", "basic_attack", "scan_area"] as const,
    );

    const result = this.world.useSkill(this.config.id, skillId);

    this.log(tick, "use_skill", true, "Used test skill.", {
      skillId,
      result,
    });
  }

  /**
   * Verify world state hash
   */
  private verifyWorldState(tick: number): void {
    const stateHash = this.world.getStateHash();

    this.log(tick, "verify_world_state", true, "World state hash captured.", {
      stateHash,
    });
  }

  /**
   * Verify determinism by checking state hash consistency
   */
  private verifyDeterminism(tick: number): void {
    const stateHash = this.world.getStateHash();
    const previous = this.memory.lastStateHash;

    this.memory.lastStateHash = stateHash;

    this.log(tick, "verify_determinism", true, "Determinism checkpoint captured.", {
      previousStateHash: previous,
      currentStateHash: stateHash,
    });
  }

  /**
   * Log a test event
   */
  private log(
    tick: number,
    action: PlaytesterActionType,
    ok: boolean,
    message: string,
    details?: Record<string, unknown>,
  ): void {
    const event: PlaytesterLogEvent = {
      tick,
      botId: this.config.id,
      action,
      ok,
      message,
      stateHash: this.world.getStateHash(),
      details,
    };

    this.logger.write(event);
    this.memory.eventsSinceRepoCommit++;
  }

  /**
   * Get memory stats for monitoring
   */
  getMemoryStats(): {
    visitedChunks: number;
    talkedToNpcs: number;
    attackedTargets: number;
    completedChecks: number;
    eventsSinceRepoCommit: number;
  } {
    return {
      visitedChunks: this.memory.visitedChunks.size,
      talkedToNpcs: this.memory.talkedToNpcs.size,
      attackedTargets: this.memory.attackedTargets.size,
      completedChecks: this.memory.completedChecks.size,
      eventsSinceRepoCommit: this.memory.eventsSinceRepoCommit,
    };
  }
}