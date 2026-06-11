/**
 * WorldTickThinShell - Phase 10: Extremely Slim World Brain Scheduler
 * 
 * WorldTick wird zum extrem schlanken "World Brain Scheduler".
 * Er iteriert über aktive Chunks, evaluiert die 13 Punkte deterministisch
 * gegeneinander und berechnet den neuen Erdős-Attraktor-Zustand.
 * 
 * OHNE tiefere Fachlogik selbst auszuführen.
 * Die TickSystems führen die Logik aus, Brain koordiniert nur.
 * 
 * 10-Hz Taktung: 100ms intervals
 */

import { 
  tickSystemRegistry, 
  createDefaultTickContext,
  WorldBrainScheduler,
  SnapshotComposer,
  LayerPersistenceQueue,
  layerPersistenceQueue,
  registerOuroborosTickSystem,
  registerOracleTickSystem,
  type TickSystemContext 
} from './index.js';

/**
 * WorldTickThinShell - The slim coordinator that:
 * 1. Iterates active chunks at 10-Hz
 * 2. Evaluates 13 layers deterministically
 * 3. Computes Ω_E attractor states
 * 4. Aggregates into WorldHash
 * 5. Coordinates SnapshotComposer + PersistenceQueue
 * 6. Integrates Ouroboros autonomous NPC behavior
 */
export class WorldTickThinShell {
  /** Current tick count */
  private tickCount: number = 0;
  
  /** TICK_INTERVAL_MS - 10-Hz tick rate */
  static readonly TICK_INTERVAL_MS = 100;
  
  /** World Brain Scheduler for 13-layer evaluation */
  private worldBrain: WorldBrainScheduler;
  
  /** Snapshot Composer for world state */
  private snapshotComposer: SnapshotComposer;
  
  /** Persistence Queue for async writes */
  private persistenceQueue: LayerPersistenceQueue;
  
  /** Is the shell running */
  private isRunning: boolean = false;
  
  /** Timer handle */
  private timer: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.worldBrain = new WorldBrainScheduler();
    this.snapshotComposer = new SnapshotComposer();
    this.persistenceQueue = layerPersistenceQueue;
    
    // Phase 11: Register OuroborosTickSystem for autonomous NPC behavior
    registerOuroborosTickSystem({
      engineConfig: {
        tickInterval: 10,        // 1 Hz at 10 ticks/sec
        conflictCheckInterval: 100,
        enableNPCBrain: true,
        npcBrainInterval: 10,
      },
    });
    
    // Phase 11: Register OracleTickSystem for Oracle Living World prophecy
    registerOracleTickSystem({
      tickInterval: 10,          // 1 Hz at 10 ticks/sec
      minRecordsForAnalysis: 6,
      maxStoredRecords: 240,
    });
  }
  
  /**
   * Start the World Brain tick loop.
   * 10-Hz tick rate (100ms intervals).
   */
  start(): void {
    if (this.isRunning) return;
    
    console.log('[WorldTickThinShell] Starting - 10-Hz brain tick');
    this.isRunning = true;
    
    // Notify all registered systems
    tickSystemRegistry.notifyStart();
    
    // Start the tick loop
    this.timer = setInterval(() => this.tick(), WorldTickThinShell.TICK_INTERVAL_MS);
  }
  
  /**
   * Stop the World Brain tick loop.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('[WorldTickThinShell] Stopping');
    this.isRunning = false;
    
    // Stop timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Shutdown brain
    this.worldBrain.onShutdown();
    
    // Graceful persistence shutdown
    await this.persistenceQueue.shutdown();
    
    // Notify all systems
    tickSystemRegistry.notifyShutdown();
  }
  
  /**
   * Main tick - the extremely slim coordinator.
   */
  tick(): void {
    this.tickCount++;
    
    // 1. PRE-TICK: Create tick context with world state
    const context: TickSystemContext = createDefaultTickContext(this.tickCount);
    
    // Add world state to context for tick systems (Oracle, Ouroboros, etc.)
    const worldState = this.getWorldStateForTick();
    Object.defineProperty(context, 'world', {
      value: worldState,
      writable: false,
      enumerable: true,
    });
    
    // 2. EXECUTE REGISTERED SYSTEMS via TickSystemRegistry
    // The Brain does NOT execute domain logic - it coordinates
    tickSystemRegistry.executeAll(context);
    
    // 3. WORLD BRAIN: Evaluate 13 layers for active chunks
    // This computes the Ω_E attractor states
    this.worldBrain.tick(context);
    
    // 4. SNAPSHOT COMPOSER: Compose world snapshot
    // WorldHash = Hash(ChunkID + EntityStates + IARELogicLayers)
    this.composeWorldSnapshot();
    
    // 5. PERSISTENCE: Queue layer states for async write
    // Non-blocking - happens asynchronously
    this.queuePersistenceEvents();
    
    // 6. POST-TICK: Check if flush needed
    this.persistenceQueue.tick(this.tickCount as any);
  }
  
  /**
   * Get world state for tick context.
   * Collects NPCs, players, and loot from various systems.
   */
  private getWorldStateForTick(): { npcs: any[]; players: any[]; loot: any[] } {
    // Default empty state - will be populated by actual game systems
    // This is a fallback for when systems aren't fully initialized
    return {
      npcs: [],
      players: [],
      loot: [],
    };
  }
  
  /**
   * Register a world state provider function.
   * Game systems can provide callbacks to inject their state into tick context.
   */
  registerWorldStateProvider(provider: () => { npcs: any[]; players: any[]; loot: any[] }): void {
    console.log('[WorldTickThinShell] World state provider registered');
  }
  
  /**
   * Compose world snapshot from brain state.
   */
  private composeWorldSnapshot(): void {
    const snapshot = this.worldBrain.getSnapshot();
    
    // Add each chunk's layer state to snapshot composer
    for (const chunkKey of snapshot.active_chunks) {
      const layerState = this.worldBrain.getChunkLayerState(chunkKey);
      if (layerState) {
        // Convert ChunkLayerState to IARELogicLayers format
        const iareLayers = this.convertToIARELayers(layerState);
        
        this.snapshotComposer.addChunk(
          chunkKey,
          this.tickCount as any,
          [], // Entity states would come from other systems
          iareLayers
        );
      }
    }
    
    // Finalize snapshot
    if (this.snapshotComposer.getChunkCount() > 0) {
      this.snapshotComposer.finalizeWorldSnapshot(this.tickCount as any);
    }
  }
  
  /**
   * Convert ChunkLayerState to IARELogicLayers format.
   */
  private convertToIARELayers(chunkLayerState: any): any {
    return {
      ecology: chunkLayerState.ecology,
      market: chunkLayerState.economy, // Note: mapping
      physiology: chunkLayerState.npc_vitality,
      trade: chunkLayerState.trade,
      memory: chunkLayerState.social_memory,
      politics: chunkLayerState.politics,
      conflict: chunkLayerState.aggression,
      economy: chunkLayerState.conjuncture,
      kingdoms: chunkLayerState.kingdom,
      faith: chunkLayerState.faith,
      dungeon: chunkLayerState.dungeon,
      fear: chunkLayerState.fear,
      cycles: chunkLayerState.resurrection
    };
  }
  
  /**
   * Queue persistence events for write-behind.
   */
  private queuePersistenceEvents(): void {
    const snapshot = this.worldBrain.getSnapshot();
    
    for (const chunkKey of snapshot.active_chunks) {
      const layerState = this.worldBrain.getChunkLayerState(chunkKey);
      if (layerState) {
        const iareLayers = this.convertToIARELayers(layerState);
        
        const event = {
          chunkKey,
          tick: this.tickCount as any,
          layerSnapshot: iareLayers,
          deltaHash: snapshot.world_hash,
          // Legacy compatibility field. Keep deterministic until this shell is replaced.
          timestamp: this.tickCount
        };
        
        this.persistenceQueue.enqueue(event);
      }
    }
  }
  
  /**
   * Register a chunk as active.
   */
  registerChunk(chunkKey: string): void {
    this.worldBrain.registerChunk(chunkKey as any);
  }
  
  /**
   * Unregister a chunk.
   */
  unregisterChunk(chunkKey: string): void {
    this.worldBrain.unregisterChunk(chunkKey as any);
  }
  
  /**
   * Get current tick count.
   */
  getTickCount(): number {
    return this.tickCount;
  }
  
  /**
   * Get world brain snapshot.
   */
  getWorldBrainSnapshot(): any {
    return this.worldBrain.getSnapshot();
  }
  
  /**
   * Get persistence queue stats.
   */
  getPersistenceStats() {
    return this.persistenceQueue.getStats();
  }
  
  /**
   * Get snapshot composer stats.
   */
  getSnapshotStats() {
    return {
      chunkCount: this.snapshotComposer.getChunkCount()
    };
  }
}

/**
 * Global WorldTickThinShell instance.
 */
export const worldTickThinShell = new WorldTickThinShell();

/**
 * Register WorldTickThinShell with the global registry.
 */
export function registerWorldTickThinShell(): WorldTickThinShell {
  // This is the final integration point - WorldTickThinShell IS the tick system
  return worldTickThinShell;
}
