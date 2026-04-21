/**
 * WorldLayout Module - Public API
 */

export type {
  LayoutSeverity,
  LayoutCategory,
  LayoutIssue,
  LayoutValidationResult,
  GLBFootprintDescriptor,
  SpatialEntity,
  RepairAction,
  RepairResult,
  LayoutConstraintRule,
  LayoutRuleContext,
  LayoutReportEntry,
  LayoutLearningEntry,
  WorldLayoutConfig,
} from "./WorldLayoutTypes.js";

export { WorldLayoutSpatialIndex, getEntityAABB, aabbOverlap, aabbDistance, pointDistance } from "./WorldLayoutSpatialIndex.js";
export { WorldLayoutConstraintRegistry } from "./WorldLayoutConstraintRegistry.js";
export { WorldLayoutReportLog } from "./WorldLayoutReportLog.js";
export { WorldLayoutLearningStore } from "./WorldLayoutLearningStore.js";
export { resolveCategory, resolveFootprint, createFootprintRegistry, getKnownCategories } from "./WorldLayoutFootprintResolver.js";

export { createBuildingPlacementRule } from "./WorldLayoutBuildingPlacementValidator.js";
export { createRoadConnectivityRule } from "./WorldLayoutRoadConnectivityValidator.js";
export { createWallConnectivityRule } from "./WorldLayoutWallConnectivityValidator.js";
export { createDoorValidatorRule } from "./WorldLayoutDoorValidator.js";
export { createDungeonDistanceRule } from "./WorldLayoutDungeonDistanceValidator.js";
export { createPathValidatorRule } from "./WorldLayoutPathValidator.js";
export { createGLBPlacementRule } from "./GLBPlacementValidator.js";

export { WorldLayoutValidator } from "./WorldLayoutValidator.js";
export { WorldLayoutRepairService } from "./WorldLayoutRepairService.js";
export { WorldLayoutRuleEngine, createDefaultLayoutConfig } from "./WorldLayoutRuleEngine.js";
export { createWorldLayoutAdapter, createLayoutHealStrategy } from "./WorldLayoutHealIntegration.js";
