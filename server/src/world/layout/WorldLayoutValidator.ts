/**
 * WorldLayoutValidator - Orchestrates all layout validation rules.
 *
 * Collects all rule results into a single LayoutValidationResult.
 * Integrates with the spatial index for efficient queries.
 */

import type {
  LayoutValidationResult,
  SpatialEntity,
  WorldLayoutConfig,
} from "./WorldLayoutTypes.js";
import { WorldLayoutSpatialIndex } from "./WorldLayoutSpatialIndex.js";
import { WorldLayoutConstraintRegistry } from "./WorldLayoutConstraintRegistry.js";
import { createBuildingPlacementRule } from "./WorldLayoutBuildingPlacementValidator.js";
import { createRoadConnectivityRule } from "./WorldLayoutRoadConnectivityValidator.js";
import { createWallConnectivityRule } from "./WorldLayoutWallConnectivityValidator.js";
import { createDoorValidatorRule } from "./WorldLayoutDoorValidator.js";
import { createDungeonDistanceRule } from "./WorldLayoutDungeonDistanceValidator.js";
import { createPathValidatorRule } from "./WorldLayoutPathValidator.js";
import { createGLBPlacementRule } from "./GLBPlacementValidator.js";
import { createTreePlacementRule } from "./TreePlacementValidator.js";

export class WorldLayoutValidator {
  private readonly registry = new WorldLayoutConstraintRegistry();
  private readonly spatialIndex: WorldLayoutSpatialIndex;
  private readonly config: WorldLayoutConfig;
  private validationSequence = 0;

  constructor(config: WorldLayoutConfig, spatialIndex?: WorldLayoutSpatialIndex) {
    this.config = config;
    this.spatialIndex = spatialIndex ?? new WorldLayoutSpatialIndex(config.chunkSize);
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.registry.register(createBuildingPlacementRule());
    this.registry.register(createRoadConnectivityRule());
    this.registry.register(createWallConnectivityRule());
    this.registry.register(createDoorValidatorRule());
    this.registry.register(createDungeonDistanceRule(
      this.config.minDungeonCityDistanceChunks,
      this.config.chunkSize
    ));
    this.registry.register(createPathValidatorRule());
    this.registry.register(createGLBPlacementRule());
    this.registry.register(createTreePlacementRule());
  }

  /**
   * Register additional rules.
   */
  addRule(rule: Parameters<WorldLayoutConstraintRegistry["register"]>[0]): void {
    this.registry.register(rule);
  }

  /**
   * Run all validation rules against the current spatial index.
   */
  validate(entities?: SpatialEntity[], deterministicTimestamp?: number): LayoutValidationResult {
    const allEntities = entities ?? this.spatialIndex.getAll();
    const context = {
      allEntities,
      chunkSize: this.config.chunkSize,
    };

    const issues = this.registry.runAll(allEntities, context);

    // Compute score: 100 minus deductions for issues
    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case "critical": score -= 15; break;
        case "invalid": score -= 8; break;
        case "warning": score -= 2; break;
      }
    }
    score = Math.max(0, score);

    return {
      ok: issues.length === 0,
      issues,
      score,
      timestamp: normalizeDeterministicTimestamp(
        deterministicTimestamp,
        () => ++this.validationSequence,
      ),
    };
  }

  /**
   * Get the spatial index for external use.
   */
  getSpatialIndex(): WorldLayoutSpatialIndex {
    return this.spatialIndex;
  }

  /**
   * Get all registered rules.
   */
  getRules(): Array<{ id: string; name: string }> {
    return this.registry.getAll().map((r) => ({ id: r.id, name: r.name }));
  }
}

function normalizeDeterministicTimestamp(value: unknown, fallback: () => number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback();
}
