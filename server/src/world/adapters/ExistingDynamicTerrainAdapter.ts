// @ts-nocheck
/**
 * ExistingDynamicTerrainAdapter — Wraps the existing DynamicTerrain integration.
 * Provides height queries, slope queries, and local terrain adjustments
 * to the WorldPlacementRuleEngine.
 *
 * Server-side: stores heightmap data for queries.
 * Client-side: wraps the actual BabylonJS DynamicTerrain instance.
 */

import type { TerrainQueryAdapter } from "../services/WorldPlacementRuleEngine.js";

export interface HeightmapDataSource {
  /** Get height at world position (x, z). Returns 0 if no data. */
  getHeight(x: number, z: number): number;
  /** Get the full heightmap as Float32Array of [x,y,z, x,y,z, ...] */
  getMapData(): Float32Array | number[];
  /** Map subdivision count on X axis */
  getMapSubX(): number;
  /** Map subdivision count on Z axis */
  getMapSubZ(): number;
  /** Map world width */
  getMapWidth(): number;
  /** Map world depth */
  getMapHeight(): number;
}

/**
 * Server-side terrain adapter that works with raw heightmap data.
 * Used by the WorldPlacementRuleEngine for placement validation.
 */
export class ServerTerrainAdapter implements TerrainQueryAdapter {
  private dataSource: HeightmapDataSource | null = null;
  private patches: Map<string, { x: number; y: number; radius: number; targetHeight: number }> = new Map();

  setDataSource(source: HeightmapDataSource): void {
    this.dataSource = source;
  }

  getHeightAt(x: number, y: number): number {
    if (!this.dataSource) return 0;

    // Check local patches first
    for (const patch of this.patches.values()) {
      const dist = Math.hypot(x - patch.x, y - patch.y);
      if (dist < patch.radius) {
        // Blend between original and patch
        const t = 1 - dist / patch.radius;
        const original = this.dataSource.getHeight(x, y);
        return original + (patch.targetHeight - original) * t;
      }
    }

    return this.dataSource.getHeight(x, y);
  }

  getSlopeAt(x: number, y: number): number {
    if (!this.dataSource) return 0;

    const sampleDist = 1;
    const h0 = this.getHeightAt(x, y);
    const hx = this.getHeightAt(x + sampleDist, y);
    const hy = this.getHeightAt(x, y + sampleDist);

    const dx = (hx - h0) / sampleDist;
    const dy = (hy - h0) / sampleDist;

    return Math.sqrt(dx * dx + dy * dy);
  }

  async flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void> {
    const patchId = `patch-${x}-${y}`;
    const radius = Math.max(width, depth) / 2;
    this.patches.set(patchId, { x, y, radius, targetHeight });
  }

  /** Get all terrain patches for client sync. */
  getPatches(): Array<{ x: number; y: number; radius: number; targetHeight: number }> {
    return Array.from(this.patches.values());
  }

  /** Check if a slope is walkable for a given asset profile. */
  isSlopeAcceptable(x: number, y: number, maxSlope: number): boolean {
    return this.getSlopeAt(x, y) <= maxSlope;
  }

  /** Get the average height in an area (for building foundations). */
  getAverageHeight(x: number, y: number, width: number, depth: number): number {
    if (!this.dataSource) return 0;

    const steps = 4;
    let sum = 0;
    let count = 0;
    const halfW = width / 2;
    const halfD = depth / 2;

    for (let ix = 0; ix < steps; ix++) {
      for (let iy = 0; iy < steps; iy++) {
        const px = x - halfW + (ix / (steps - 1)) * width;
        const py = y - halfD + (iy / (steps - 1)) * depth;
        sum += this.getHeightAt(px, py);
        count++;
      }
    }

    return sum / count;
  }
}

/**
 * Client-side terrain adapter that wraps the actual BabylonJS DynamicTerrain instance.
 * Import this only in client code.
 */
export class ClientTerrainAdapter implements TerrainQueryAdapter {
  private terrainRef: any = null;

  setTerrainInstance(terrain: any): void {
    this.terrainRef = terrain;
  }

  getHeightAt(x: number, y: number): number {
    if (!this.terrainRef) return 0;
    try {
      return this.terrainRef.getHeightFromMap(x, y);
    } catch {
      return 0;
    }
  }

  getSlopeAt(x: number, y: number): number {
    const sampleDist = 1;
    const h0 = this.getHeightAt(x, y);
    const hx = this.getHeightAt(x + sampleDist, y);
    const hy = this.getHeightAt(x, y + sampleDist);
    const dx = (hx - h0) / sampleDist;
    const dy = (hy - h0) / sampleDist;
    return Math.sqrt(dx * dx + dy * dy);
  }

  async flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void> {
    // Client-side: update the DynamicTerrain map data
    // This requires modifying the mapData array and calling terrain.update(true)
    if (!this.terrainRef) return;

    const mapData = this.terrainRef.mapData;
    const mapSubX = this.terrainRef.mapSubX;
    const mapSubZ = this.terrainRef.mapSubZ;

    if (!mapData || !mapSubX || !mapSubZ) return;

    const halfW = width / 2;
    const halfD = depth / 2;

    for (let j = 0; j < mapSubZ; j++) {
      for (let i = 0; i < mapSubX; i++) {
        const idx = (j * mapSubX + i) * 3;
        const px = mapData[idx];
        const pz = mapData[idx + 2];

        if (px >= x - halfW && px <= x + halfW && pz >= y - halfD && pz <= y + halfD) {
          // Blend height toward target
          const distFromCenter = Math.hypot(px - x, pz - y);
          const maxDist = Math.hypot(halfW, halfD);
          const t = Math.max(0, 1 - distFromCenter / maxDist);
          mapData[idx + 1] = mapData[idx + 1] + (targetHeight - mapData[idx + 1]) * t;
        }
      }
    }

    this.terrainRef.update(true);
  }
}
