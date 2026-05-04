// @ts-nocheck
/**
 * WorldLayoutHeal - Core type definitions for rule-based world layout validation,
 * repair, and GLB placement checking.
 *
 * No AI, fully deterministic, modular, explainable.
 */

// ─── Layout Severity & Category ────────────────────────────────────────────

export type LayoutSeverity = "warning" | "invalid" | "critical";

export type LayoutCategory =
  | "house"
  | "wall"
  | "gate"
  | "tower"
  | "road"
  | "path"
  | "dungeon"
  | "door"
  | "decoration"
  | "tree"
  | "well"
  | "market"
  | "castle"
  | "bridge"
  | "fence"
  | "unknown";

// ─── Layout Issue ──────────────────────────────────────────────────────────

export interface LayoutIssue {
  id: string;
  severity: LayoutSeverity;
  code: string;
  category: LayoutCategory;
  message: string;
  entityId?: string;
  assetPath?: string;
  position?: { x: number; y: number };
  chunkX?: number;
  chunkY?: number;
  details?: Record<string, unknown>;
  suggestedRepair?: string;
  repairable: boolean;
}

export interface LayoutValidationResult {
  ok: boolean;
  issues: LayoutIssue[];
  /** 0..100 layout health score */
  score: number;
  timestamp: number;
}

// ─── GLB Footprint Descriptor ──────────────────────────────────────────────

export interface GLBFootprintDescriptor {
  assetPath: string;
  category: LayoutCategory;
  /** Width in placement units (world x-axis at 0-degree rotation) */
  width: number;
  /** Depth in placement units (world y-axis at 0-degree rotation) */
  depth: number;
  /** Optional height for 3D overlap checks */
  height?: number;
  /** Minimum clear space around this object */
  minSpacing?: number;
  /** Does this object need road/path access? */
  requiresRoadAccess?: boolean;
  /** Does this object need to snap to a wall? */
  requiresWallSnap?: boolean;
  /** Allowed rotation angles in radians (empty = any) */
  allowedRotations?: number[];
  /** Which side the door is on (for buildings) */
  doorwaySide?: "north" | "east" | "south" | "west";
  /** Snap socket names this object provides */
  snapSockets?: string[];
  /** Y-offset for ground alignment (negative = partially below ground) */
  groundOffset?: number;
  /** Bounding box override (if not using width/depth/height) */
  boundingBox?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

// ─── Spatial Entity ────────────────────────────────────────────────────────

export interface SpatialEntity {
  id: string;
  type: string;
  category: LayoutCategory;
  position: { x: number; y: number };
  /** Y position for height checks (optional) */
  positionZ?: number;
  rotation?: number;
  scale?: number;
  glbPath?: string;
  footprint: GLBFootprintDescriptor;
}

// ─── Repair Action ─────────────────────────────────────────────────────────

export type RepairActionType =
  | "move"
  | "rotate"
  | "snap"
  | "add_road"
  | "add_wall_segment"
  | "add_gate"
  | "replace"
  | "reposition_dungeon"
  | "mark_invalid"
  | "quarantine";

export interface RepairAction {
  id: string;
  type: RepairActionType;
  issueId: string;
  entityId?: string;
  message: string;
  /** Position delta for move repairs */
  deltaPosition?: { x: number; y: number };
  /** Target position for repositioning */
  targetPosition?: { x: number; y: number };
  /** New rotation angle */
  newRotation?: number;
  /** Whether the repair was successfully applied */
  success: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Before snapshot (entity state before repair) */
  before?: Record<string, unknown>;
  /** After snapshot (entity state after repair) */
  after?: Record<string, unknown>;
  timestamp: number;
}

// ─── Repair Result ─────────────────────────────────────────────────────────

export interface RepairResult {
  repaired: number;
  failed: number;
  quarantined: number;
  skipped: number;
  actions: RepairAction[];
  timestamp: number;
}

// ─── Constraint Rule ───────────────────────────────────────────────────────

export interface LayoutConstraintRule {
  id: string;
  name: string;
  description: string;
  severity: LayoutSeverity;
  /** Which categories this rule applies to */
  categories: LayoutCategory[] | "*";
  /** Run the rule check */
  check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[];
}

export interface LayoutRuleContext {
  allEntities: SpatialEntity[];
  chunkSize: number;
  /** Distance in chunks for boundary checks */
  cityRadius?: number;
  /** Known city center positions */
  cityCenters?: Array<{ x: number; y: number; radius: number }>;
}

// ─── Layout Report Log ─────────────────────────────────────────────────────

export interface LayoutReportEntry {
  timestamp: number;
  issueCode: string;
  severity: LayoutSeverity;
  entityId?: string;
  assetPath?: string;
  position?: { x: number; y: number };
  repairStrategy?: string;
  success?: boolean;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  notes?: string;
}

// ─── Learning Entry (no AI, heuristic statistics) ──────────────────────────

export interface LayoutLearningEntry {
  /** Pattern key: `${category}:${issueCode}` */
  patternKey: string;
  occurrenceCount: number;
  successfulStrategy: string;
  successCount: number;
  failureCount: number;
  lastSeenAt: number;
  firstSeenAt: number;
}

// ─── Wall Graph ────────────────────────────────────────────────────────────

export interface WallSegment {
  entityId: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  connected: boolean;
}

// ─── Road Graph ────────────────────────────────────────────────────────────

export interface RoadNode {
  id: string;
  position: { x: number; y: number };
  /** Connected road node ids */
  connections: string[];
}

// ─── Configuration ─────────────────────────────────────────────────────────

export interface WorldLayoutConfig {
  /** Minimum distance between two buildings */
  minBuildingSpacing: number;
  /** Minimum distance from building to road/path */
  minBuildingRoadAccess: number;
  /** Minimum chunks between world boss dungeon and city */
  minDungeonCityDistanceChunks: number;
  /** Chunk size (must match WorldTick) */
  chunkSize: number;
  /** Maximum auto-repair attempts per issue */
  maxRepairAttempts: number;
  /** Repair cooldown ms */
  repairCooldownMs: number;
  /** Enable auto-repair */
  autoRepairEnabled: boolean;
  /** Storage directory for logs/learning */
  storageDir: string;
  /** Verbose logging */
  verbose: boolean;
}
