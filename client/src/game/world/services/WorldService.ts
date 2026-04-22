/**
 * WorldService — Central orchestrator for all client-side world services.
 * Wires together physics, navigation, terrain, trees, atmosphere, text,
 * streaming, 10Hz chunk watchdog, and texture cloning.
 *
 * Import this single service and call init() to bootstrap everything.
 */

import { Scene, Camera } from "@babylonjs/core";
import { physicsService } from "./PhysicsService.js";
import { navigationService } from "./NavigationService.js";
import { networkInterpolation } from "./NetworkInterpolationService.js";
import { atmosphereService } from "./AtmosphereService.js";
import { textLabelService } from "./TextLabelService.js";
import { streamingService } from "./StreamingRegistrationService.js";
import { worldGenerator, type WorldGeneratorConfig } from "./WorldGeneratorService.js";
import { textureCloneService } from "./TextureCloneService.js";
import { chunkService, type ChunkServiceConfig } from "./ChunkService.js";
import { watchdogService, type ChunkLoadCallback } from "./WatchdogService.js";

export interface WorldServiceConfig {
  enablePhysics: boolean;
  enableNavigation: boolean;
  enableAtmosphere: boolean;
  enableTextLabels: boolean;
  enableStreaming: boolean;
  enableInterpolation: boolean;
  enableWorldGeneration: boolean;
  enable10HzWatchdog: boolean;
  streamRadii: Record<string, number>;
  worldGenerator?: Partial<WorldGeneratorConfig>;
  chunkService?: Partial<ChunkServiceConfig>;
}

const DEFAULT_CONFIG: WorldServiceConfig = {
  enablePhysics: true,
  enableNavigation: true,
  enableAtmosphere: true,
  enableTextLabels: true,
  enableStreaming: true,
  enableInterpolation: true,
  enableWorldGeneration: true,
  enable10HzWatchdog: true,
  streamRadii: {
    buildings: 80,
    roads: 60,
    walls: 60,
    dungeons: 100,
    vegetation: 50,
    props: 40,
    spawns: 60,
    resources: 50,
  },
};

export class WorldService {
  private scene: Scene | null = null;
  private camera: Camera | null = null;
  private config: WorldServiceConfig;
  private initialized = false;

  constructor(config?: Partial<WorldServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(scene: Scene, camera: Camera): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;
    this.camera = camera;

    console.log("[WorldService] Initializing all world services...");

    // Init in dependency order
    if (this.config.enablePhysics) {
      try { await physicsService.init(scene); } catch (e) { console.warn("[WorldService] Physics init failed:", e); }
    }

    if (this.config.enableNavigation) {
      try { await navigationService.init(scene); } catch (e) { console.warn("[WorldService] Navigation init failed:", e); }
    }

    if (this.config.enableAtmosphere) {
      try { await atmosphereService.init(scene); } catch (e) { console.warn("[WorldService] Atmosphere init failed:", e); }
    }

    if (this.config.enableTextLabels) {
      try {
        await textLabelService.init(scene);
        textLabelService.setCamera(camera);
      } catch (e) { console.warn("[WorldService] TextLabel init failed:", e); }
    }

    // World generation (terrain + trees) — must come after physics so ground colliders work
    if (this.config.enableWorldGeneration) {
      try {
        await worldGenerator.init(scene, camera);
      } catch (e) { console.warn("[WorldService] World generation init failed:", e); }
    }

    // 10Hz watchdog — starts the chunk-based streaming tick loop
    if (this.config.enable10HzWatchdog) {
      try {
        // Seed master materials (belt and suspenders — watchdog also seeds)
        textureCloneService.getMaster(scene, "trunk");
        textureCloneService.getMaster(scene, "leaf");
        textureCloneService.getMaster(scene, "stone");
        textureCloneService.getMaster(scene, "grass");
        textureCloneService.getMaster(scene, "dirt");
        textureCloneService.getMaster(scene, "wood");

        // Set up chunk load callback — generates procedural objects per chunk
        watchdogService.onLoad((coord) => {
          // Future: load chunk objects from server or procedural generation
          // For now, return empty — trees are generated at init by WorldGeneratorService
          return [];
        });

        // Start the 10Hz watchdog
        watchdogService.start(scene, camera);
        console.log("[WorldService] 10Hz watchdog active.");
      } catch (e) { console.warn("[WorldService] Watchdog init failed:", e); }
    }

    this.initialized = true;
    console.log("[WorldService] All world services initialized.");
  }

  /** Call every frame to update all services. */
  update(): void {
    if (!this.initialized || !this.camera) return;

    const now = Date.now();

    // Network interpolation
    if (this.config.enableInterpolation) {
      networkInterpolation.update(now);
    }

    // Text label visibility
    if (this.config.enableTextLabels) {
      textLabelService.updateVisibility();
    }

    // Streaming (per-frame distance check for registered assets)
    if (this.config.enableStreaming) {
      streamingService.update(this.camera.position);
    }

    // World generator (terrain LOD is handled internally)
    if (this.config.enableWorldGeneration) {
      worldGenerator.update();
    }

    // Navigation dirty rebuild (throttled)
    if (this.config.enableNavigation && navigationService.needsRebuild()) {
      navigationService.rebuildDirtyRegions();
    }

    // NOTE: 10Hz watchdog runs on its own setInterval — no per-frame update needed
  }

  /** Set a custom chunk load callback (replaces the default one). */
  setChunkLoadCallback(callback: ChunkLoadCallback): void {
    watchdogService.onLoad(callback);
  }

  /** Get comprehensive debug stats. */
  getStats(): Record<string, any> {
    return {
      physics: physicsService.getStats(),
      navigation: navigationService.getStats(),
      interpolation: networkInterpolation.getStats(),
      textLabels: textLabelService.getStats(),
      streaming: streamingService.getStats(),
      atmosphere: { active: atmosphereService.isActive() },
      worldGenerator: worldGenerator.getStats(),
      textureClone: textureCloneService.getStats(),
      chunks: chunkService.getStats(),
      watchdog: watchdogService.getStats(),
    };
  }

  get physics() { return physicsService; }
  get navigation() { return navigationService; }
  get interpolation() { return networkInterpolation; }
  get atmosphere() { return atmosphereService; }
  get textLabels() { return textLabelService; }
  get streaming() { return streamingService; }
  get worldGen() { return worldGenerator; }
  get textures() { return textureCloneService; }
  get chunks() { return chunkService; }
  get watchdog() { return watchdogService; }

  dispose(): void {
    watchdogService.stop();
    physicsService.dispose();
    navigationService.dispose();
    networkInterpolation.clear();
    atmosphereService.dispose();
    textLabelService.dispose();
    streamingService.clear();
    worldGenerator.dispose();
    textureCloneService.dispose();
    chunkService.clear();
    this.initialized = false;
  }
}

export const worldService = new WorldService();
