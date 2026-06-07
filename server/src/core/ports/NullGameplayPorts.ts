/**
 * NULL GAMEPLAY PORTS
 *
 * Explicit null/placeholder implementations for unconnected gameplay systems.
 * These provide honest, typed responses instead of silent {} placeholders.
 *
 * Rules:
 * - Null ports must be explicit and honest
 * - All methods require logicalIndex
 * - No direct mutation hidden inside port contracts
 */

import type {
  CraftingPort,
  CraftingResult,
  SkillPort,
  SkillUseResult,
  PlacementPort,
  PlacementResult,
} from "./GameplayPorts.js";

export class NullCraftingPort implements CraftingPort {
  public readonly kind = "crafting" as const;

  public craft(_playerId: string, _recipeId: string, _logicalIndex: number): CraftingResult {
    return Object.freeze({
      ok: false,
      reason: "crafting_not_connected",
    });
  }
}

export class NullSkillPort implements SkillPort {
  public readonly kind = "skill" as const;

  public useSkill(_playerId: string, _skillId: string, _logicalIndex: number): SkillUseResult {
    return Object.freeze({
      ok: false,
      reason: "skill_not_connected",
    });
  }
}

export class NullPlacementPort implements PlacementPort {
  public readonly kind = "placement" as const;

  public place(
    _playerId: string,
    _blueprintId: string,
    _tileX: number,
    _tileZ: number,
    _logicalIndex: number,
  ): PlacementResult {
    return Object.freeze({
      ok: false,
      reason: "placement_not_connected",
    });
  }
}