/**
 * GLBAssetIngestionPipeline — Central pipeline for processing all GLB assets.
 * Classifies, profiles, validates, and registers every imported asset.
 *
 * Runs automatically on asset import. Feeds into WorldPlacementRuleEngine.
 */

import type { AssetProfile, InstancingStrategy } from "../rules/assetProfiles.js";
import { getAssetProfile, resolveProfileFromPath, resolveProfileFromMetadata } from "../rules/assetProfiles.js";

export type IngestionState = "pending" | "analyzing" | "profiled" | "validated" | "ready" | "failed";

export interface AssetIngestionResult {
  id: string;
  assetPath: string;
  state: IngestionState;
  profile: AssetProfile;
  boundingBox: { width: number; depth: number; height: number };
  meshNames: string[];
  materialNames: string[];
  hasCollision: boolean;
  hasSockets: boolean;
  socketPositions: Record<string, { x: number; y: number; z: number }>;
  instancingStrategy: InstancingStrategy;
  errors: string[];
  warnings: string[];
  ingestTimeMs: number;
}

export class GLBAssetIngestionPipeline {
  private cache = new Map<string, AssetIngestionResult>();
  private listeners: Array<(result: AssetIngestionResult) => void> = [];
  private ingestSequence = 0;

  /**
   * Ingest a GLB asset. Analyzes meshes, materials, bounding box, and resolves profile.
   */
  async ingest(
    assetId: string,
    assetPath: string,
    meshData?: {
      meshNames?: string[];
      materialNames?: string[];
      boundingBox?: { width: number; depth: number; height: number };
      socketPositions?: Record<string, { x: number; y: number; z: number }>;
    },
    categoryHint?: string
  ): Promise<AssetIngestionResult> {
    const startOrdinal = this.ingestSequence;
    const cached = this.cache.get(assetId);
    if (cached && cached.state === "ready") return cached;

    const result: AssetIngestionResult = {
      id: assetId,
      assetPath,
      state: "analyzing",
      profile: getAssetProfile("unknown"),
      boundingBox: { width: 3, depth: 3, height: 3 },
      meshNames: [],
      materialNames: [],
      hasCollision: false,
      hasSockets: false,
      socketPositions: {},
      instancingStrategy: "unique",
      errors: [],
      warnings: [],
      ingestTimeMs: 0,
    };

    try {
      // 1. Extract mesh data
      if (meshData) {
        result.meshNames = meshData.meshNames ?? [];
        result.materialNames = meshData.materialNames ?? [];
        result.boundingBox = meshData.boundingBox ?? result.boundingBox;
        result.socketPositions = meshData.socketPositions ?? {};
        result.hasSockets = Object.keys(result.socketPositions).length > 0;
      }

      // 2. Resolve asset profile
      result.state = "profiled";
      if (categoryHint) {
        result.profile = getAssetProfile(categoryHint);
      } else if (result.meshNames.length > 0) {
        result.profile = resolveProfileFromMetadata(result.meshNames, result.boundingBox);
      } else {
        result.profile = resolveProfileFromPath(assetPath);
      }

      // If path-based gave unknown, try name-based
      if (result.profile.category === "unknown" && result.meshNames.length > 0) {
        result.profile = resolveProfileFromMetadata(result.meshNames, result.boundingBox);
      }

      // 3. Validate profile against actual dimensions
      result.state = "validated";
      const dimMismatch =
        Math.abs(result.boundingBox.width - result.profile.footprintWidth) > result.profile.footprintWidth * 0.5 ||
        Math.abs(result.boundingBox.depth - result.profile.footprintDepth) > result.profile.footprintDepth * 0.5;
      if (dimMismatch) {
        result.warnings.push(
          `Profile footprint (${result.profile.footprintWidth}x${result.profile.footprintDepth}) ` +
          `differs significantly from actual bounds (${result.boundingBox.width.toFixed(1)}x${result.boundingBox.depth.toFixed(1)}).`
        );
      }

      // 4. Check collision
      result.hasCollision = result.meshNames.some(
        (n) => n.toLowerCase().includes("collider") || n.toLowerCase().includes("collision")
      );

      // 5. Determine instancing strategy
      result.instancingStrategy = result.profile.canUseThinInstances ? "thin_instance" : "unique";

      // 6. Check for sockets (doors, connections)
      const socketNames = Object.keys(result.socketPositions);
      if (socketNames.length > 0) {
        // Auto-detect doorway/road-snap/wall-snap sockets
        for (const name of socketNames) {
          const lower = name.toLowerCase();
          if (lower.includes("door") && !result.profile.doorwaySide) {
            result.warnings.push(`Socket "${name}" looks like a doorway but profile has no doorwaySide.`);
          }
        }
      }

      // 7. Size-based validation
      if (result.boundingBox.width > 50 || result.boundingBox.depth > 50) {
        result.warnings.push("Asset is very large (>50 units). Consider splitting or using thin instances.");
      }
      if (result.boundingBox.height < 0.1) {
        result.warnings.push("Asset height is very small (<0.1). May be a flat decal.");
      }

      result.state = "ready";
    } catch (err: unknown) {
      result.state = "failed";
      result.errors.push(err instanceof Error ? err.message : String(err));
    }

    this.ingestSequence += 1;
    result.ingestTimeMs = this.ingestSequence - startOrdinal;
    this.cache.set(assetId, result);

    for (const listener of this.listeners) {
      try { listener(result); } catch {}
    }

    return result;
  }

  /** Get cached ingestion result. */
  getCached(assetId: string): AssetIngestionResult | undefined {
    return this.cache.get(assetId);
  }

  /** Get all ingested assets by category. */
  getByCategory(category: string): AssetIngestionResult[] {
    return Array.from(this.cache.values()).filter((r) => r.profile.category === category);
  }

  /** Get all assets using a specific instancing strategy. */
  getByStrategy(strategy: InstancingStrategy): AssetIngestionResult[] {
    return Array.from(this.cache.values()).filter((r) => r.instancingStrategy === strategy);
  }

  /** Subscribe to ingestion events. */
  onIngested(listener: (result: AssetIngestionResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /** Get ingestion stats. */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byStrategy: Record<string, number>;
    withWarnings: number;
    withErrors: number;
  } {
    const all = Array.from(this.cache.values());
    const byCategory: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    for (const r of all) {
      byCategory[r.profile.category] = (byCategory[r.profile.category] ?? 0) + 1;
      byStrategy[r.instancingStrategy] = (byStrategy[r.instancingStrategy] ?? 0) + 1;
    }
    return {
      total: all.length,
      byCategory,
      byStrategy,
      withWarnings: all.filter((r) => r.warnings.length > 0).length,
      withErrors: all.filter((r) => r.errors.length > 0).length,
    };
  }

  clear(): void {
    this.cache.clear();
    this.ingestSequence = 0;
  }
}
