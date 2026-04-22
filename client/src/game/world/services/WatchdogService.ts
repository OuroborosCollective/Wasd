/**
 * WatchdogService — 10Hz player position monitoring.
 *
 * Runs a setInterval at 100ms (10Hz), checks player position,
 * triggers chunk load/unload operations via ChunkService.
 * Processes 1 chunk per tick to avoid CPU spikes.
 *
 * Usage:
 *   watchdogService.start(scene, camera);
 *   // ... runs automatically
 *   watchdogService.stop();
 */

import { Scene, Camera, Vector3 } from "@babylonjs/core";
import { chunkService, type ChunkCoord, type ChunkObject } from "./ChunkService.js";
import { textureCloneService } from "./TextureCloneService.js";

export type ChunkLoadCallback = (coord: ChunkCoord) => ChunkObject[];

export interface WatchdogStats {
  running: boolean;
  tickCount: number;
  tickRate: number; // actual Hz
  lastTickMs: number;
  avgTickDuration: number;
  chunksLoaded: number;
  chunksUnloaded: number;
}

export class WatchdogService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private tickCount = 0;
  private tickRate = 10; // Target Hz
  private lastTickTime = 0;
  private tickDurations: number[] = [];
  private chunksLoaded = 0;
  private chunksUnloaded = 0;
  private loadCallback: ChunkLoadCallback | null = null;

  /**
   * Start the 10Hz watchdog loop.
   * @param scene - Babylon scene (used for context)
   * @param camera - Camera whose position drives chunk decisions
   */
  start(scene: Scene, camera: Camera): void {
    if (this.running) return;

    console.log("[WatchdogService] Starting 10Hz chunk watchdog...");
    this.running = true;
    this.tickCount = 0;
    this.lastTickTime = performance.now();
    this.tickDurations = [];

    // Initialize chunk service with player position
    const pos = camera.position;
    chunkService.updatePlayerPosition(pos);

    // Seed master materials
    textureCloneService.getMaster(scene, "trunk");
    textureCloneService.getMaster(scene, "leaf");
    textureCloneService.getMaster(scene, "stone");
    textureCloneService.getMaster(scene, "grass");
    textureCloneService.getMaster(scene, "dirt");
    textureCloneService.getMaster(scene, "wood");

    // Run at 10Hz (100ms)
    this.intervalId = setInterval(() => {
      this.tick(camera);
    }, 100);

    console.log("[WatchdogService] 10Hz watchdog started.");
  }

  /** Set the callback that generates chunk objects when a chunk needs loading. */
  onLoad(callback: ChunkLoadCallback): void {
    this.loadCallback = callback;
  }

  /** Internal tick handler. */
  private tick(camera: Camera): void {
    const tickStart = performance.now();

    try {
      const pos = camera.position;

      // Update chunk service with current position
      const { toLoad, toUnload } = chunkService.updatePlayerPosition(
        new Vector3(pos.x, pos.y, pos.z)
      );

      this.chunksUnloaded += toUnload.length;

      // Process 1 chunk load per tick
      const nextChunk = chunkService.getNextToLoad();
      if (nextChunk && this.loadCallback) {
        const objects = this.loadCallback(nextChunk);
        chunkService.markLoaded(nextChunk.x, nextChunk.z, objects);
        this.chunksLoaded++;
      }
    } catch (err) {
      console.warn("[WatchdogService] Tick error:", err);
    }

    this.tickCount++;

    // Track tick duration for stats
    const duration = performance.now() - tickStart;
    this.tickDurations.push(duration);
    if (this.tickDurations.length > 100) this.tickDurations.shift();
    this.lastTickTime = tickStart;
  }

  /** Stop the watchdog loop. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log(`[WatchdogService] Stopped after ${this.tickCount} ticks.`);
  }

  /** Is the watchdog running? */
  isRunning(): boolean {
    return this.running;
  }

  /** Get stats for debug overlay. */
  getStats(): WatchdogStats {
    const avgDuration = this.tickDurations.length > 0
      ? this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length
      : 0;

    return {
      running: this.running,
      tickCount: this.tickCount,
      tickRate: this.tickRate,
      lastTickMs: this.lastTickTime,
      avgTickDuration: Math.round(avgDuration * 100) / 100,
      chunksLoaded: this.chunksLoaded,
      chunksUnloaded: this.chunksUnloaded,
    };
  }

  /** Cleanup. */
  dispose(): void {
    this.stop();
    this.loadCallback = null;
    this.chunksLoaded = 0;
    this.chunksUnloaded = 0;
    this.tickDurations = [];
  }
}

export const watchdogService = new WatchdogService();
