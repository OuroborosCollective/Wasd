/**
 * WorldPlacementRuleEngine — Central orchestrator for ALL world placement.
 *
 * This is the single entry point for placing, validating, and correcting assets.
 * It wraps the existing WorldLayoutHeal validators and adds:
 * - Asset profile resolution
 * - Terrain queries via adapter
 * - Vegetation exclusion via adapter
 * - Nav dirty marking
 * - Event emission
 * - Placement state tracking
 */

import type { SpatialEntity, LayoutIssue } from "../layout/WorldLayoutTypes.js";
import { WorldLayoutRuleEngine } from "../layout/WorldLayoutRuleEngine.js";
import type { AssetProfile } from "../rules/assetProfiles.js";
import { getAssetProfile, resolveProfileFromPath, resolveProfileFromMetadata } from "../rules/assetProfiles.js";
import type { PlacementRules } from "../rules/placementRules.js";
import { resolvePlacementRules } from "../rules/placementRules.js";
import { worldEvents } from "../events/worldPlacementEvents.js";

export type PlacementState = "proposed" | "validated" | "corrected" | "rejected" | "requires-manual-review";

export interface PlacementRequest {
  id: string;
  assetPath: string;
  category?: string;
  position: { x: number; y: number };
  positionZ?: number;
  rotation?: number;
  scale?: number;
  meshNames?: string[];
  boundingBox?: { width: number; depth: number; height: number };
  metadata?: Record<string, unknown>;
}

export interface PlacementResult {
  state: PlacementState;
  request: PlacementRequest;
  profile: AssetProfile;
  finalPosition: { x: number; y: number };
  finalPositionZ: number;
  finalRotation: number;
  corrections: string[];
  issues: LayoutIssue[];
  terrainChanged: boolean;
  vegetationExclusionApplied: boolean;
  navDirty: boolean;
  timestamp: number;
}

export class WorldPlacementRuleEngine {
  private layoutEngine: WorldLayoutRuleEngine;
  private rules: PlacementRules;
  private placementHistory: Map<string, PlacementResult> = new Map();
  private terrainAdapter: TerrainQueryAdapter | null = null;
  private vegetationAdapter: VegetationExclusionAdapter | null = null;
  private navAdapter: NavDirtyAdapter | null = null;
  private placementSequence = 0;

  constructor(
    layoutEngine: WorldLayoutRuleEngine,
    rules?: Partial<PlacementRules>
  ) {
    this.layoutEngine = layoutEngine;
    this.rules = resolvePlacementRules(rules);
  }

  // ── Adapter registration ──────────────────────────────────────────────

  setTerrainAdapter(adapter: TerrainQueryAdapter): void {
    this.terrainAdapter = adapter;
  }

  setVegetationAdapter(adapter: VegetationExclusionAdapter): void {
    this.vegetationAdapter = adapter;
  }

  setNavAdapter(adapter: NavDirtyAdapter): void {
    this.navAdapter = adapter;
  }

  // ── Core placement pipeline ───────────────────────────────────────────

  /**
   * Place an asset in the world. Returns the final placement result
   * after validation, correction, and all dependent system updates.
   */
  async placeAsset(request: PlacementRequest): Promise<PlacementResult> {
    await worldEvents.emit({
      type: "onAssetImported",
      assetId: request.id,
      category: request.category ?? "unknown",
      assetPath: request.assetPath,
    });

    // 1. Resolve asset profile
    const profile = this.resolveProfile(request);

    // 2. Build spatial entity
    const entity = this.buildSpatialEntity(request, profile);

    // 3. Validate placement
    await worldEvents.emit({
      type: "onPlacementProposed",
      assetId: request.id,
      position: request.position,
      category: profile.category,
    });

    const issues = this.validatePlacement(entity);

    // 4. Determine initial state
    let state: PlacementState = issues.length === 0 ? "validated" : "proposed";
    const corrections: string[] = [];
    let finalPosition = { ...request.position };
    let finalPositionZ = request.positionZ ?? 0;
    let finalRotation = request.rotation ?? 0;
    let terrainChanged = false;
    let vegExclusionApplied = false;
    let navDirty = false;

    // 5. Apply corrections for repairable issues
    const repairable = issues.filter((i) => i.repairable);
    if (repairable.length > 0) {
      // Add entity temporarily for validation (don't wipe existing world data)
      this.layoutEngine.addEntities([{
        id: entity.id,
        type: entity.type,
        name: entity.id,
        position: entity.position,
        rotation: entity.rotation,
        scale: entity.scale,
        glbPath: entity.glbPath
      }]);
      const repairResult = await this.layoutEngine.validateAndRepair();
      // Remove temporary entity after validation
      this.layoutEngine.removeEntity(entity.id);

      if (repairResult.repair && repairResult.repair.actions.length > 0) {
        for (const action of repairResult.repair.actions) {
          if (action.success) {
            state = "corrected";
            corrections.push(action.message);

            if (action.type === "move" && action.targetPosition) {
              finalPosition = action.targetPosition;
            }
            if (action.type === "snap") {
              finalPositionZ = 0;
            }
            if (action.type === "rotate" && action.after?.rotation !== undefined) {
              finalRotation = action.after.rotation as number;
            }
          }
        }
      }

      // Check remaining issues after repair
      const updatedEntity = this.buildSpatialEntity(
        { ...request, position: finalPosition, positionZ: finalPositionZ, rotation: finalRotation },
        profile
      );
      const remainingIssues = this.validatePlacement(updatedEntity);

      if (remainingIssues.filter((i) => i.severity === "critical").length > 0) {
        state = "rejected";
      } else if (remainingIssues.length > 0) {
        state = "requires-manual-review";
      } else if (state === "corrected") {
        // Corrections were successful
      } else {
        state = "validated";
      }
    }

    // 6. Terrain adjustment
    if (profile.requiresFlattening && this.terrainAdapter && state !== "rejected") {
      try {
        await this.terrainAdapter.flattenArea(
          finalPosition.x,
          finalPosition.y,
          profile.footprintWidth + profile.flatteningPadding,
          profile.footprintDepth + profile.flatteningPadding,
          finalPositionZ
        );
        terrainChanged = true;
      } catch (err) {
        console.warn(`[PlacementEngine] Terrain flatten failed for ${request.id}:`, err);
      }
    }

    // 7. Vegetation exclusion
    if (profile.vegetationExclusionRadius > 0 && this.vegetationAdapter && state !== "rejected") {
      try {
        await this.vegetationAdapter.excludeArea(
          request.id,
          finalPosition.x,
          finalPosition.y,
          profile.vegetationExclusionRadius
        );
        vegExclusionApplied = true;
      } catch (err) {
        console.warn(`[PlacementEngine] Veg exclusion failed for ${request.id}:`, err);
      }
    }

    // 8. Nav dirty
    if (profile.navImpact !== "none" && this.navAdapter && state !== "rejected") {
      const pad = profile.navObstaclePadding + this.rules.navObstaclePadding;
      this.navAdapter.markDirty(
        request.id,
        finalPosition.x - profile.footprintWidth / 2 - pad,
        finalPosition.y - profile.footprintDepth / 2 - pad,
        finalPosition.x + profile.footprintWidth / 2 + pad,
        finalPosition.y + profile.footprintDepth / 2 + pad
      );
      navDirty = true;
    }

    // 9. Emit events and record
    const result: PlacementResult = {
      state,
      request,
      profile,
      finalPosition,
      finalPositionZ,
      finalRotation,
      corrections,
      issues: state === "rejected" ? issues : issues.filter((i) => !i.repairable),
      terrainChanged,
      vegetationExclusionApplied: vegExclusionApplied,
      navDirty,
      timestamp: this.nextPlacementTimestamp(request),
    };

    if (state === "validated") {
      await worldEvents.emit({ type: "onPlacementValidated", assetId: request.id, position: finalPosition });
    } else if (state === "corrected") {
      await worldEvents.emit({
        type: "onPlacementCorrected",
        assetId: request.id,
        original: request.position,
        corrected: finalPosition,
        reason: corrections.join("; "),
      });
    } else if (state === "rejected") {
      await worldEvents.emit({
        type: "onPlacementRejected",
        assetId: request.id,
        reason: issues.map((i) => i.message).join("; "),
        position: finalPosition,
      });
    }

    if (terrainChanged) {
      await worldEvents.emit({
        type: "onTerrainPatched",
        regionId: request.id,
        bounds: {
          minX: finalPosition.x - profile.footprintWidth,
          minY: finalPosition.y - profile.footprintDepth,
          maxX: finalPosition.x + profile.footprintWidth,
          maxY: finalPosition.y + profile.footprintDepth,
        },
      });
    }

    if (navDirty) {
      await worldEvents.emit({
        type: "onNavRegionDirty",
        regionId: request.id,
        bounds: {
          minX: finalPosition.x - profile.footprintWidth,
          minY: finalPosition.y - profile.footprintDepth,
          maxX: finalPosition.x + profile.footprintWidth,
          maxY: finalPosition.y + profile.footprintDepth,
        },
      });
    }

    this.placementHistory.set(request.id, result);
    return result;
  }

  /**
   * Remove an asset and clean up all dependent systems.
   */
  async removeAsset(assetId: string): Promise<void> {
    const result = this.placementHistory.get(assetId);
    if (!result) return;

    if (result.vegetationExclusionApplied && this.vegetationAdapter) {
      await this.vegetationAdapter.removeExclusion(assetId);
    }

    if (result.navDirty && this.navAdapter) {
      this.navAdapter.markDirty(
        assetId,
        result.finalPosition.x - result.profile.footprintWidth,
        result.finalPosition.y - result.profile.footprintDepth,
        result.finalPosition.x + result.profile.footprintWidth,
        result.finalPosition.y + result.profile.footprintDepth
      );
    }

    await worldEvents.emit({
      type: "onAssetRemoved",
      assetId,
      category: result.profile.category,
      position: result.finalPosition,
    });

    this.placementHistory.delete(assetId);
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getPlacementHistory(): PlacementResult[] {
    return Array.from(this.placementHistory.values());
  }

  getRejectedPlacements(): PlacementResult[] {
    return this.getPlacementHistory().filter((r) => r.state === "rejected");
  }

  getCorrectedPlacements(): PlacementResult[] {
    return this.getPlacementHistory().filter((r) => r.state === "corrected");
  }

  getStats(): {
    total: number;
    validated: number;
    corrected: number;
    rejected: number;
    pending: number;
  } {
    const all = this.getPlacementHistory();
    return {
      total: all.length,
      validated: all.filter((r) => r.state === "validated").length,
      corrected: all.filter((r) => r.state === "corrected").length,
      rejected: all.filter((r) => r.state === "rejected").length,
      pending: all.filter((r) => r.state === "requires-manual-review").length,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private resolveProfile(request: PlacementRequest): AssetProfile {
    if (request.category) return getAssetProfile(request.category);
    if (request.meshNames && request.boundingBox) {
      return resolveProfileFromMetadata(request.meshNames, request.boundingBox);
    }
    return resolveProfileFromPath(request.assetPath);
  }

  private buildSpatialEntity(req: PlacementRequest, profile: AssetProfile): SpatialEntity {
    // Map AssetCategory to LayoutCategory if needed, but for now we use 'building' as type
    // and let the resolver handle the category.
    return {
      id: req.id,
      type: "building", // Added required 'type' property
      category: profile.category as any,
      position: { x: req.position.x, y: req.position.y },
      positionZ: req.positionZ ?? 0,
      rotation: req.rotation ?? 0,
      scale: req.scale ?? 1,
      glbPath: req.assetPath,
      footprint: {
        assetPath: req.assetPath,
        category: profile.category as any,
        width: profile.footprintWidth,
        depth: profile.footprintDepth,
        minSpacing: profile.minSpacing,
        allowedRotations: profile.allowedRotations,
        requiresRoadAccess: profile.requiresRoadAccess,
        requiresWallSnap: profile.snapToWall,
        doorwaySide: profile.doorwaySide,
      },
    };
  }

  private validatePlacement(entity: SpatialEntity): LayoutIssue[] {
    // Fixed TS2554: Pass [entity] to validate()
    const result = this.layoutEngine.getValidator().validate([entity]);
    return result.issues;
  }

  private nextPlacementTimestamp(request: PlacementRequest): number {
    const metadata = request.metadata ?? {};
    const provided = metadata.tick ?? metadata.timestamp ?? metadata.simulationMs;
    if (typeof provided === "number" && Number.isSafeInteger(provided) && provided >= 0) {
      return provided;
    }

    this.placementSequence += 1;
    return this.placementSequence;
  }
}

// ── Adapter interfaces ─────────────────────────────────────────────────

export interface TerrainQueryAdapter {
  getHeightAt(x: number, y: number): number;
  getSlopeAt(x: number, y: number): number;
  flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void>;
}

export interface VegetationExclusionAdapter {
  excludeArea(id: string, x: number, y: number, radius: number): Promise<void>;
  removeExclusion(id: string): Promise<void>;
  isExcluded(x: number, y: number): boolean;
}

export interface NavDirtyAdapter {
  markDirty(id: string, minX: number, minY: number, maxX: number, maxY: number): void;
  getDirtyRegions(): Array<{ id: string; bounds: { minX: number; minY: number; maxX: number; maxY: number } }>;
  clearDirty(id: string): void;
}
