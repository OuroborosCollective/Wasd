/**
 * NetworkInterpolationService — Buffered interpolation for remote entities.
 * Smooths positions/rotations of other players, NPCs, and monsters.
 *
 * Docs: https://doc.babylonjs.com/communityExtensions/bufferedInterpolation/
 */

import { Vector3, Quaternion, TransformNode } from "@babylonjs/core";

export interface InterpolationConfig {
  bufferDelayMs: number;      // How far behind real-time to read (smoothing buffer)
  maxBufferSize: number;       // Max snapshots to keep
  snapThreshold: number;       // Distance threshold for hard snap (teleport correction)
  rotationSnapThreshold: number; // Rotation threshold for hard snap
  extrapolationLimitMs: number; // Max time to extrapolate beyond buffer
}

const DEFAULT_CONFIG: InterpolationConfig = {
  bufferDelayMs: 100,
  maxBufferSize: 20,
  snapThreshold: 10,
  rotationSnapThreshold: Math.PI / 2,
  extrapolationLimitMs: 200,
};

interface Snapshot {
  timestamp: number;
  position: Vector3;
  rotation: Quaternion;
}

interface InterpolatedEntity {
  id: string;
  node: TransformNode;
  buffer: Snapshot[];
  config: InterpolationConfig;
  lastUpdateTime: number;
  isLocal: boolean;
}

export class NetworkInterpolationService {
  private entities = new Map<string, InterpolatedEntity>();
  private defaultConfig: InterpolationConfig;

  constructor(config?: Partial<InterpolationConfig>) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /** Register a remote entity for interpolation. */
  register(id: string, node: TransformNode, isLocal: boolean = false): void {
    this.entities.set(id, {
      id,
      node,
      buffer: [],
      config: { ...this.defaultConfig },
      lastUpdateTime: 0,
      isLocal,
    });
  }

  /** Unregister an entity. */
  unregister(id: string): void {
    this.entities.delete(id);
  }

  /** Push a new network state update for an entity. */
  pushState(id: string, position: { x: number; y: number; z: number }, rotation?: { x: number; y: number; z: number; w: number }, timestamp?: number): void {
    const entity = this.entities.get(id);
    if (!entity || entity.isLocal) return;

    const ts = timestamp ?? Date.now();
    const snapshot: Snapshot = {
      timestamp: ts,
      position: new Vector3(position.x, position.y, position.z),
      rotation: rotation
        ? new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
        : entity.node.rotationQuaternion?.clone() ?? Quaternion.Identity(),
    };

    entity.buffer.push(snapshot);
    entity.lastUpdateTime = ts;

    // Trim buffer
    while (entity.buffer.length > entity.config.maxBufferSize) {
      entity.buffer.shift();
    }
  }

  /** Update all entities — call this in the render loop. */
  update(currentTime: number = Date.now()): void {
    for (const entity of this.entities.values()) {
      if (entity.isLocal || entity.buffer.length === 0) continue;

      // Target time with buffer delay
      const renderTime = currentTime - entity.config.bufferDelayMs;

      // Find the two snapshots to interpolate between
      let prev: Snapshot | null = null;
      let next: Snapshot | null = null;

      for (let i = entity.buffer.length - 1; i >= 0; i--) {
        if (entity.buffer[i].timestamp <= renderTime) {
          prev = entity.buffer[i];
          next = entity.buffer[i + 1] ?? null;
          break;
        }
      }

      if (!prev) {
        // Buffer hasn't reached renderTime yet — use oldest snapshot
        prev = entity.buffer[0];
        next = entity.buffer[1] ?? null;
      }

      if (!next) {
        // Only one snapshot or at the end — just set position
        this.applySnapshot(entity, prev);
        continue;
      }

      // Interpolation factor
      const duration = next.timestamp - prev.timestamp;
      const t = duration > 0 ? Math.max(0, Math.min(1, (renderTime - prev.timestamp) / duration)) : 1;

      // Check for hard snap (teleport)
      const dist = Vector3.Distance(prev.position, next.position);
      if (dist > entity.config.snapThreshold) {
        this.applySnapshot(entity, next);
        continue;
      }

      // Lerp position
      const pos = Vector3.Lerp(prev.position, next.position, t);

      // Slerp rotation
      const rot = Quaternion.Slerp(prev.rotation, next.rotation, t);

      entity.node.position.copyFrom(pos);
      if (entity.node.rotationQuaternion) {
        entity.node.rotationQuaternion.copyFrom(rot);
      }
    }
  }

  /** Force a hard snap to a position (e.g., after teleport). */
  snapTo(id: string, position: { x: number; y: number; z: number }): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    entity.node.position.set(position.x, position.y, position.z);
    entity.buffer = [{
      timestamp: Date.now(),
      position: new Vector3(position.x, position.y, position.z),
      rotation: entity.node.rotationQuaternion?.clone() ?? Quaternion.Identity(),
    }];
  }

  /** Get entity buffer size (for debug). */
  getBufferSize(id: string): number {
    return this.entities.get(id)?.buffer.length ?? 0;
  }

  /** Set per-entity config. */
  setEntityConfig(id: string, config: Partial<InterpolationConfig>): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.config = { ...entity.config, ...config };
    }
  }

  /** Get stats. */
  getStats(): { total: number; remote: number; avgBufferSize: number } {
    const all = Array.from(this.entities.values());
    const remote = all.filter((e) => !e.isLocal);
    const totalBuffer = remote.reduce((sum, e) => sum + e.buffer.length, 0);
    return {
      total: all.length,
      remote: remote.length,
      avgBufferSize: remote.length > 0 ? totalBuffer / remote.length : 0,
    };
  }

  private applySnapshot(entity: InterpolatedEntity, snapshot: Snapshot): void {
    entity.node.position.copyFrom(snapshot.position);
    if (entity.node.rotationQuaternion) {
      entity.node.rotationQuaternion.copyFrom(snapshot.rotation);
    }
  }

  clear(): void {
    this.entities.clear();
  }
}

export const networkInterpolation = new NetworkInterpolationService();
