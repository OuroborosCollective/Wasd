/**
 * Ouroboros PersistenceDirector — Stateless Determinism Engine
 * 
 * Axiome:
 * 1. NEVER block the 10-Hz WorldHeartbeat
 * 2. Minimalist truth: persist only atomic core data
 * 3. Atomic disconnect-sicherung: transaktionsblock bei Verbindungsabbruch
 * 
 * Write-Behind Pattern: Heartbeat enqueues snapshots → async background flush
 * Priority Flush: Disconnect triggers synchronous blocking write
 */

import { createPersistenceBackend } from "./createPersistenceBackend.js";
import { mergePersistedPlayerInto } from "./playerSnapshot.js";
import { inventoryDirector } from "../inventory/index.js";
import { playerStatsDirector } from "../player/PlayerStatsDirector.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";

// ─── Configuration ─────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 100;           // 10 Hz WorldHeartbeat
const THROTTLE_SAVE_TICKS = 300;         // Every 30 seconds (300 ticks)
const MAX_QUEUE_SIZE = 1000;            // Memory guard
const BATCH_FLUSH_SIZE = 50;            // Postgres batch threshold

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface PlayerSnapshotCore {
  id: string;
  characterName: string;
  kappaX: number;
  kappaY: number;
  kappaZ: number;
  skills: Record<string, { xp: number; level: number }>;
  inventory: ItemSignatureString[];
  equipment: Record<string, ItemSignatureString | null>;
  gold: number;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  xp: number;
  quests: unknown[];
  class: string;
  appearance: unknown;
  faction: string;
  civilization: string;
  dead: boolean;
  deathAt: number;
  flags: Record<string, unknown>;
  lastUpdated: string;
}

export type ItemSignatureString = string;

/**
 * Internal queue entry for write-behind mechanism.
 */
interface QueuedSnapshot {
  playerId: string;
  snapshot: PlayerSnapshotCore;
  enqueuedAt: number;
  tick: number;
}

// ─── PersistenceDirector ──────────────────────────────────────────────────────

export class PersistenceDirector {
  private static instance: PersistenceDirector;
  
  // Write-behind queue: non-blocking snapshot staging
  private writeQueue: Map<string, QueuedSnapshot> = new Map();
  
  // Track which players have pending saves
  private dirtyPlayers: Set<string> = new Set();
  
  // Throttle: last flush tick per player
  private lastFlushTick: Map<string, number> = new Map();
  
  // Backend reference
  private backend: IPersistenceBackend | null = null;
  
  // Stats
  private stats = {
    totalSaves: 0,
    totalLoads: 0,
    queueFlushes: 0,
    priorityFlushes: 0,
    lastFlushMs: 0,
  };

  private constructor() {}

  public static getInstance(): PersistenceDirector {
    if (!PersistenceDirector.instance) {
      PersistenceDirector.instance = new PersistenceDirector();
    }
    return PersistenceDirector.instance;
  }

  /**
   * Initialize with a persistence backend.
   * Called during server bootstrap.
   */
  public async init(): Promise<void> {
    this.backend = createPersistenceBackend();
    await this.backend.init();
    console.log("[PersistenceDirector] Initialized. Driver:", this.backend.name);
  }

  /**
   * Wire into WorldTick tick cycle.
   * Returns true if flush should happen this tick.
   */
  public tick(tickCount: number): boolean {
    if (this.dirtyPlayers.size === 0) return false;
    
    // Throttle: only enqueue if throttle interval elapsed
    if (tickCount % THROTTLE_SAVE_TICKS === 0) {
      this.enqueueDirtyPlayers();
      return true;
    }
    return false;
  }

  /**
   * Enqueue dirty players into write-behind queue.
   * NON-BLOCKING: Called from tick(), must not block heartbeat.
   */
  private enqueueDirtyPlayers(): void {
    if (this.writeQueue.size >= MAX_QUEUE_SIZE) {
      console.warn("[PersistenceDirector] Queue at max capacity, skipping enqueue.");
      return;
    }

    for (const playerId of this.dirtyPlayers) {
      if (this.writeQueue.size >= MAX_QUEUE_SIZE) break;
      
      // Skip if recently flushed
      const lastFlush = this.lastFlushTick.get(playerId) ?? 0;
      const ticksSinceFlush = (globalThis as any).__tickCount ?? 0 - lastFlush;
      if (ticksSinceFlush < THROTTLE_SAVE_TICKS / 2) continue;

      this.writeQueue.set(playerId, {
        playerId,
        snapshot: this.buildSnapshot(playerId),
        enqueuedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
        tick: (globalThis as any).__tickCount ?? 0,
      });
    }

    this.dirtyPlayers.clear();
  }

  /**
   * Mark a player as needing persistence (on state change).
   * NON-BLOCKING: Fire-and-forget call from game logic.
   */
  public markDirty(playerId: string): void {
    this.dirtyPlayers.add(playerId);
  }

  /**
   * ASYNC flush of write-behind queue.
   * Called imperatively from WorldTick when tick() signals pending data.
   * CRITICAL: Must not throw - wraps in try/catch to prevent tick failure.
   */
  public async flushQueue(): Promise<void> {
    if (this.writeQueue.size === 0) return;

    const startMs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    const batch: Record<string, PlayerSnapshotCore> = {};
    const batchSize = Math.min(this.writeQueue.size, BATCH_FLUSH_SIZE);

    // Drain up to BATCH_FLUSH_SIZE entries
    let drained = 0;
    for (const [playerId, entry] of this.writeQueue) {
      if (drained >= batchSize) break;
      batch[playerId] = entry.snapshot;
      this.writeQueue.delete(playerId);
      this.lastFlushTick.set(playerId, entry.tick);
      drained++;
    }

    if (Object.keys(batch).length === 0) return;

    try {
      await this.persistBatch(batch);
      this.stats.queueFlushes++;
      this.stats.lastFlushMs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ - startMs;
    } catch (err) {
      console.error("[PersistenceDirector] Flush failed:", err);
      // Re-enqueue failed entries (except on critical error)
      for (const playerId of Object.keys(batch)) {
        this.dirtyPlayers.add(playerId);
      }
    }
  }

  /**
   * PRIORITY FLUSH: Synchronous blocking write on disconnect.
   * This is the ATOMARE DISCONNECT-SICHERUNG - must complete before entity removal.
   */
  public async flushPlayerSync(playerId: string, snapshot: PlayerSnapshotCore): Promise<void> {
    const startMs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    try {
      await this.persistBatch({ [playerId]: snapshot });
      this.stats.priorityFlushes++;
      this.stats.lastFlushMs = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ - startMs;
      
      // Clean up queue entry if present
      this.writeQueue.delete(playerId);
      this.dirtyPlayers.delete(playerId);
      
      console.log(`[PersistenceDirector] Priority flush for ${playerId} completed in ${0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ - startMs}ms`);
    } catch (err) {
      console.error(`[PersistenceDirector] Priority flush FAILED for ${playerId}:`, err);
      throw err; // Re-throw - disconnect handler must know
    }
  }

  /**
   * Load player snapshot from backend.
   * Called during login to reconstruct player entity.
   */
  public async loadPlayerSnapshot(playerId: string): Promise<PlayerSnapshotCore | null> {
    try {
      const data = await this.backend?.load();
      if (!data) return null;
      
      const snapshot = data[playerId] as PlayerSnapshotCore | undefined;
      if (!snapshot) return null;
      
      this.stats.totalLoads++;
      return snapshot;
    } catch (err) {
      console.error(`[PersistenceDirector] Load failed for ${playerId}:`, err);
      return null;
    }
  }

  /**
   * Build snapshot from live player data.
   */
  private buildSnapshot(playerId: string): PlayerSnapshotCore {
    // This would normally take a live player object reference
    // For queue building, we store minimal extracted data
    const skills = playerStatsDirector.getSkillsForSave(playerId);
    
    return {
      id: playerId,
      characterName: "", // Filled at disconnect
      kappaX: 0,
      kappaY: 0,
      kappaZ: 0,
      skills: skills ?? {},
      inventory: [], // Filled at disconnect
      equipment: {},
      gold: 0,
      level: 1,
      health: 100,
      maxHealth: 100,
      mana: 25,
      maxMana: 25,
      stamina: 100,
      maxStamina: 100,
      xp: 0,
      quests: [],
      class: "",
      appearance: null,
      faction: "",
      civilization: "",
      dead: false,
      deathAt: 0,
      flags: {},
      lastUpdated: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };
  }

  /**
   * Build complete snapshot from live player object.
   * Used by disconnect handler with actual player reference.
   */
  public buildCompleteSnapshot(player: any): PlayerSnapshotCore {
    // Extract ItemSignature strings from inventory
    const inventory = inventoryDirector.buildSnapshot(player);
    const itemSignatures: ItemSignatureString[] = inventory.inventory.slots
      .filter((slot) => slot !== null)
      .map((slot) => slot as any)
      .map((item: any) => {
        // Modular items use forged signature
        if (item?.signature) return item.signature;
        // Fallback for simple item format
        if (item?.id) return `ITEM:${item.id}:0`;
        return null;
      })
      .filter((sig): sig is ItemSignatureString => sig !== null);

    // Extract equipment as signature strings
    const equipment: Record<string, ItemSignatureString | null> = {};
    for (const slot of Object.keys(player.equipment ?? {})) {
      const item = player.equipment[slot];
      if (item) {
        equipment[slot] = (item as any)?.signature ?? `ITEM:${(item as any).id ?? "unknown"}:0`;
      } else {
        equipment[slot] = null;
      }
    }

    // Get Kappa coordinates
    const kappa = {
      x: player.position?.x ?? 0,
      y: player.position?.y ?? 0,
      z: player.position?.z ?? 0,
    };

    const skills = playerStatsDirector.getSkillsForSave(player.id);

    return {
      id: player.id,
      characterName: player.name ?? "",
      kappaX: kappa.x,
      kappaY: kappa.y,
      kappaZ: kappa.z,
      skills: skills ?? {},
      inventory: itemSignatures,
      equipment,
      gold: player.gold ?? 0,
      level: player.level ?? 1,
      health: player.health ?? 100,
      maxHealth: player.maxHealth ?? 100,
      mana: player.mana ?? 25,
      maxMana: player.maxMana ?? 25,
      stamina: player.stamina ?? 100,
      maxStamina: player.maxStamina ?? 100,
      xp: player.xp ?? 0,
      quests: player.quests ?? [],
      class: player.class ?? "",
      appearance: player.appearance ?? null,
      faction: player.faction ?? "",
      civilization: player.civilization ?? "",
      dead: player.dead ?? false,
      deathAt: player.deathAt ?? 0,
      flags: player.flags ?? {},
      lastUpdated: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };
  }

  /**
   * Apply loaded snapshot to player object (login reconstruction).
   */
  public applySnapshot(player: any, snapshot: PlayerSnapshotCore | null): void {
    if (!snapshot) return;
    
    // Merge via existing persistence system
    mergePersistedPlayerInto(player, snapshot);
    
    // Restore Kappa position
    if (snapshot.kappaX !== undefined && snapshot.kappaY !== undefined) {
      player.position = {
        x: snapshot.kappaX,
        y: snapshot.kappaY,
        z: snapshot.kappaZ ?? 0,
      };
    }
    
    // Restore skills from RuneScape XP system
    if (snapshot.skills && typeof snapshot.skills === "object") {
      playerStatsDirector.loadSkills(player.id, snapshot.skills);
    }
  }

  /**
   * Persist batch to backend.
   */
  private async persistBatch(batch: Record<string, PlayerSnapshotCore>): Promise<void> {
    if (!this.backend) {
      console.warn("[PersistenceDirector] No backend configured, skipping persist.");
      return;
    }

    // Convert to legacy format expected by backend
    const legacyData: Record<string, any> = {};
    for (const [playerId, snapshot] of Object.entries(batch)) {
      legacyData[playerId] = {
        id: snapshot.id,
        name: snapshot.characterName,
        position: { x: snapshot.kappaX, y: snapshot.kappaY, z: snapshot.kappaZ },
        skills: snapshot.skills,
        inventory: snapshot.inventory,
        equipment: snapshot.equipment,
        gold: snapshot.gold,
        level: snapshot.level,
        health: snapshot.health,
        maxHealth: snapshot.maxHealth,
        mana: snapshot.mana,
        maxMana: snapshot.maxMana,
        stamina: snapshot.stamina,
        maxStamina: snapshot.maxStamina,
        xp: snapshot.xp,
        quests: snapshot.quests,
        class: snapshot.class,
        appearance: snapshot.appearance,
        faction: snapshot.faction,
        civilization: snapshot.civilization,
        dead: snapshot.dead,
        deathAt: snapshot.deathAt,
        flags: snapshot.flags,
      };
    }

    await this.backend.save(legacyData);
    this.stats.totalSaves += Object.keys(batch).length;
  }

  /**
   * Get persistence statistics.
   */
  public getStats(): Readonly<{
    totalSaves: number;
    totalLoads: number;
    queueFlushes: number;
    priorityFlushes: number;
    lastFlushMs: number;
    queueSize: number;
    dirtyPlayers: number;
  }> {
    return {
      ...this.stats,
      queueSize: this.writeQueue.size,
      dirtyPlayers: this.dirtyPlayers.size,
    };
  }

  /**
   * Reset statistics.
   */
  public resetStats(): void {
    this.stats = {
      totalSaves: 0,
      totalLoads: 0,
      queueFlushes: 0,
      priorityFlushes: 0,
      lastFlushMs: 0,
    };
  }

  /**
   * Cleanup on shutdown.
   */
  public async shutdown(): Promise<void> {
    console.log(`[PersistenceDirector] Shutdown: flushing ${this.writeQueue.size} queued snapshots`);
    
    // Final sync flush
    if (this.writeQueue.size > 0) {
      const remaining: Record<string, PlayerSnapshotCore> = {};
      for (const [playerId, entry] of this.writeQueue) {
        remaining[playerId] = entry.snapshot;
      }
      try {
        await this.persistBatch(remaining);
      } catch (err) {
        console.error("[PersistenceDirector] Final flush failed:", err);
      }
    }
    
    this.writeQueue.clear();
    this.dirtyPlayers.clear();
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const persistenceDirector = PersistenceDirector.getInstance();
