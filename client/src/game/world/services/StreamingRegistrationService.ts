/**
 * StreamingRegistrationService — Manages chunk-based asset streaming.
 * Coordinates which assets are loaded/unloaded based on camera position.
 */

import { Vector3 } from "@babylonjs/core";

export interface StreamableAsset {
  id: string;
  position: { x: number; y: number };
  streamGroup: string;
  streamRadius: number;
  priority: number;
  loaded: boolean;
}

export class StreamingRegistrationService {
  private assets = new Map<string, StreamableAsset>();
  private streamRadii: Record<string, number>;
  private defaultRadius: number;
  private loadCallback: ((assetId: string) => void) | null = null;
  private unloadCallback: ((assetId: string) => void) | null = null;

  constructor(streamRadii: Record<string, number> = {}, defaultRadius: number = 50) {
    this.streamRadii = streamRadii;
    this.defaultRadius = defaultRadius;
  }

  /** Register an asset for streaming. */
  register(
    id: string,
    position: { x: number; y: number },
    streamGroup: string,
    priority: number = 0
  ): void {
    this.assets.set(id, {
      id,
      position,
      streamGroup,
      streamRadius: this.streamRadii[streamGroup] ?? this.defaultRadius,
      priority,
      loaded: false,
    });
  }

  /** Unregister an asset. */
  unregister(id: string): void {
    this.assets.delete(id);
  }

  /** Update streaming based on camera position. Call each frame. */
  update(cameraPosition: Vector3): { loaded: string[]; unloaded: string[] } {
    const loaded: string[] = [];
    const unloaded: string[] = [];

    for (const asset of this.assets.values()) {
      const dist = Math.hypot(
        cameraPosition.x - asset.position.x,
        cameraPosition.z - asset.position.y
      );

      const shouldLoad = dist < asset.streamRadius;

      if (shouldLoad && !asset.loaded) {
        asset.loaded = true;
        loaded.push(asset.id);
        if (this.loadCallback) this.loadCallback(asset.id);
      } else if (!shouldLoad && asset.loaded) {
        asset.loaded = false;
        unloaded.push(asset.id);
        if (this.unloadCallback) this.unloadCallback(asset.id);
      }
    }

    return { loaded, unloaded };
  }

  /** Set callbacks. */
  onLoad(cb: (assetId: string) => void): void { this.loadCallback = cb; }
  onUnload(cb: (assetId: string) => void): void { this.unloadCallback = cb; }

  /** Get loaded count per group. */
  getStats(): Record<string, { total: number; loaded: number }> {
    const stats: Record<string, { total: number; loaded: number }> = {};
    for (const asset of this.assets.values()) {
      if (!stats[asset.streamGroup]) stats[asset.streamGroup] = { total: 0, loaded: 0 };
      stats[asset.streamGroup].total++;
      if (asset.loaded) stats[asset.streamGroup].loaded++;
    }
    return stats;
  }

  getAsset(id: string): StreamableAsset | undefined {
    return this.assets.get(id);
  }

  clear(): void {
    this.assets.clear();
  }
}

export const streamingService = new StreamingRegistrationService();
