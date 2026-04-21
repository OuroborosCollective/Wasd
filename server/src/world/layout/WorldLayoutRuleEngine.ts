/**
 * WorldLayoutRuleEngine - Main orchestrator for world layout validation and repair.
 *
 * Ties together validation, spatial indexing, repair, learning, and reporting.
 * Designed for integration with LiveHeal / WorldTick.
 */

import { resolve } from "node:path";
import type {
  WorldLayoutConfig,
  SpatialEntity,
  LayoutValidationResult,
  RepairResult,
  LayoutIssue,
  GLBFootprintDescriptor,
} from "./WorldLayoutTypes.js";
import { WorldLayoutValidator } from "./WorldLayoutValidator.js";
import { WorldLayoutRepairService } from "./WorldLayoutRepairService.js";
import { WorldLayoutSpatialIndex } from "./WorldLayoutSpatialIndex.js";
import { WorldLayoutLearningStore } from "./WorldLayoutLearningStore.js";
import { WorldLayoutReportLog } from "./WorldLayoutReportLog.js";
import { resolveCategory, resolveFootprint } from "./WorldLayoutFootprintResolver.js";

export function createDefaultLayoutConfig(storageDir: string): WorldLayoutConfig {
  return {
    minBuildingSpacing: 2,
    minBuildingRoadAccess: 15,
    minDungeonCityDistanceChunks: 65,
    chunkSize: 64,
    maxRepairAttempts: 3,
    repairCooldownMs: 10_000,
    autoRepairEnabled: true,
    storageDir,
    verbose: false,
  };
}

export class WorldLayoutRuleEngine {
  private readonly config: WorldLayoutConfig;
  private readonly validator: WorldLayoutValidator;
  private readonly repairService: WorldLayoutRepairService;
  private readonly spatialIndex: WorldLayoutSpatialIndex;
  private readonly learningStore: WorldLayoutLearningStore;
  private readonly reportLog: WorldLayoutReportLog;
  private readonly footprintRegistry: Map<string, GLBFootprintDescriptor>;

  private lastValidation: LayoutValidationResult | null = null;
  private lastRepair: RepairResult | null = null;
  private validationCount = 0;
  private repairCount = 0;

  constructor(config: WorldLayoutConfig, footprintRegistry?: Map<string, GLBFootprintDescriptor>) {
    this.config = config;
    this.footprintRegistry = footprintRegistry ?? new Map();
    this.spatialIndex = new WorldLayoutSpatialIndex(config.chunkSize);
    this.learningStore = new WorldLayoutLearningStore(
      resolve(config.storageDir, "layout-learning.json")
    );
    this.reportLog = new WorldLayoutReportLog(
      resolve(config.storageDir, "layout-report.ndjson")
    );
    this.validator = new WorldLayoutValidator(config, this.spatialIndex);
    this.repairService = new WorldLayoutRepairService(
      config, this.spatialIndex, this.learningStore, this.reportLog
    );
  }

  /**
   * Load world objects into the spatial index for validation.
   */
  loadEntities(objects: Array<{
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
    glbPath?: string;
  }>): void {
    this.spatialIndex.clear();
    for (const obj of objects) {
      this.insertEntity(obj);
    }
  }

  /**
   * Add entities to the spatial index without clearing existing ones.
   */
  addEntities(objects: Array<{
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
    glbPath?: string;
  }>): void {
    for (const obj of objects) {
      this.insertEntity(obj);
    }
  }

  /**
   * Remove an entity from the spatial index by ID.
   */
  removeEntity(id: string): void {
    this.spatialIndex.remove(id);
  }

  private insertEntity(obj: {
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
    glbPath?: string;
  }): void {
    const category = resolveCategory(obj.type, obj.name, obj.glbPath);
    const footprint = resolveFootprint(obj.glbPath, category, this.footprintRegistry);
    const entity: SpatialEntity = {
      id: obj.id,
      type: obj.type,
      category,
      position: obj.position,
      rotation: obj.rotation,
      scale: obj.scale,
      glbPath: obj.glbPath,
      footprint,
    };
    this.spatialIndex.insert(entity);
  }

  /**
   * Validate the current world layout.
   */
  validate(): LayoutValidationResult {
    this.validationCount++;
    this.lastValidation = this.validator.validate();
    return this.lastValidation;
  }

  /**
   * Validate and auto-repair if enabled.
   */
  async validateAndRepair(): Promise<{ validation: LayoutValidationResult; repair: RepairResult | null }> {
    const validation = this.validate();

    if (!validation.ok && this.config.autoRepairEnabled) {
      this.repairCount++;
      this.lastRepair = await this.repairService.repairAll(validation.issues);
      // Re-validate after repair
      this.lastValidation = this.validator.validate();
      return { validation: this.lastValidation, repair: this.lastRepair };
    }

    return { validation, repair: null };
  }

  /**
   * Get the current health status for LiveHeal integration.
   */
  getHealthStatus(): {
    ok: boolean;
    score: number;
    issueCount: number;
    criticalCount: number;
    invalidCount: number;
    warningCount: number;
    lastValidationAt: number | null;
  } {
    const v = this.lastValidation;
    return {
      ok: v?.ok ?? true,
      score: v?.score ?? 100,
      issueCount: v?.issues.length ?? 0,
      criticalCount: v?.issues.filter((i) => i.severity === "critical").length ?? 0,
      invalidCount: v?.issues.filter((i) => i.severity === "invalid").length ?? 0,
      warningCount: v?.issues.filter((i) => i.severity === "warning").length ?? 0,
      lastValidationAt: v?.timestamp ?? null,
    };
  }

  /**
   * Get statistics.
   */
  getStats() {
    return {
      entityCount: this.spatialIndex.size,
      validationCount: this.validationCount,
      repairCount: this.repairCount,
      learningEntries: this.learningStore.size,
      logEntries: this.reportLog.count,
      rules: this.validator.getRules(),
    };
  }

  getSpatialIndex(): WorldLayoutSpatialIndex { return this.spatialIndex; }
  getValidator(): WorldLayoutValidator { return this.validator; }
  getLearningStore(): WorldLayoutLearningStore { return this.learningStore; }

  flush(): void {
    this.learningStore.flush();
    this.reportLog.compact();
  }
}
