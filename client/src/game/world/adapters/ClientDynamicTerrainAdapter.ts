/**
 * ClientDynamicTerrainAdapter — Wraps the existing DynamicTerrain for client-side use.
 * Integrates with the WorldService and PhysicsService.
 */

import { Scene, Mesh, Camera, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
import type { TerrainQueryAdapter } from "../../services/WorldGeneratorService";

// Re-export the terrain creation functions from our existing integration
export {
  createDynamicTerrain,
  createProceduralTerrain,
  generateProceduralHeightmap,
} from "../../../lib/babylon-extensions/dynamicTerrainExample";

import type { IDynamicTerrain } from "../../../lib/babylon-extensions/DynamicTerrain";

/**
 * Client-side terrain adapter that wraps a DynamicTerrain instance.
 * Provides height/slope queries and terrain flattening for building placement.
 */
export class ClientDynamicTerrainAdapter implements TerrainQueryAdapter {
  private terrain: IDynamicTerrain | null = null;

  setTerrain(terrain: IDynamicTerrain): void {
    this.terrain = terrain;
  }

  getHeightAt(x: number, y: number): number {
    if (!this.terrain) return 0;
    try {
      return this.terrain.getHeightFromMap(x, y);
    } catch {
      return 0;
    }
  }

  getSlopeAt(x: number, y: number): number {
    const d = 1;
    const h0 = this.getHeightAt(x, y);
    const hx = this.getHeightAt(x + d, y);
    const hy = this.getHeightAt(x, y + d);
    return Math.sqrt(((hx - h0) / d) ** 2 + ((hy - h0) / d) ** 2);
  }

  async flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void> {
    if (!this.terrain) return;

    const mapData = this.terrain.mapData;
    const mapSubX = this.terrain.mapSubX;
    const mapSubZ = this.terrain.mapSubZ;
    if (!mapData || !mapSubX || !mapSubZ) return;

    const halfW = width / 2;
    const halfD = depth / 2;

    for (let j = 0; j < mapSubZ; j++) {
      for (let i = 0; i < mapSubX; i++) {
        const idx = (j * mapSubX + i) * 3;
        const px = mapData[idx];
        const pz = mapData[idx + 2];

        if (px >= x - halfW && px <= x + halfW && pz >= y - halfD && pz <= y + halfD) {
          const distFromCenter = Math.hypot(px - x, pz - y);
          const maxDist = Math.hypot(halfW, halfD);
          const t = Math.max(0, 1 - distFromCenter / maxDist);
          // Smooth blend
          mapData[idx + 1] = mapData[idx + 1] + (targetHeight - mapData[idx + 1]) * t * t;
        }
      }
    }

    this.terrain.update(true);
  }

  /** Get the underlying terrain instance. */
  getTerrain(): IDynamicTerrain | null {
    return this.terrain;
  }
}

export const clientTerrainAdapter = new ClientDynamicTerrainAdapter();