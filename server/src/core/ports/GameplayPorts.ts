/**
 * GAMEPLAY PORTS
 *
 * Typed port interfaces for gameplay systems connected to WorldTick.
 * All operations require logicalIndex for deterministic tracking.
 *
 * Rules:
 * - No Math.random() in port implementations
 * - No Date.now() for gameplay decisions
 * - All operations require logicalIndex
 * - Null ports must return explicit failure, not silent {}
 */

export interface CraftingResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly jobId?: string;
}

export interface CraftingPort {
  readonly kind: "crafting";
  craft(playerId: string, recipeId: string, logicalIndex: number): CraftingResult;
}

export interface SkillUseResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly cooldownTicks?: number;
}

export interface SkillPort {
  readonly kind: "skill";
  useSkill(playerId: string, skillId: string, logicalIndex: number): SkillUseResult;
}

export interface PlacementResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly structureId?: string;
}

export interface PlacementPort {
  readonly kind: "placement";
  place(playerId: string, blueprintId: string, tileX: number, tileZ: number, logicalIndex: number): PlacementResult;
}