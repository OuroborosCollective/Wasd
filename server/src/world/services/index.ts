// @ts-nocheck
/**
 * World Services Index — Exports all world placement and orchestration services.
 */

// Rule engine
export { WorldPlacementRuleEngine } from "./WorldPlacementRuleEngine.js";
export type { PlacementRequest, PlacementResult, PlacementState, TerrainQueryAdapter, VegetationExclusionAdapter, NavDirtyAdapter } from "./WorldPlacementRuleEngine.js";

// Asset pipeline
export { GLBAssetIngestionPipeline } from "./GLBAssetIngestionPipeline.js";
export type { AssetIngestionResult, IngestionState } from "./GLBAssetIngestionPipeline.js";
