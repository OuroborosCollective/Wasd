import type { CraftingPort, SkillPort, PlacementPort } from "./GameplayPorts.js";

export class NullCraftingPort implements CraftingPort {
  craft(_playerId: string, _recipeId: string, _logicalIndex: number): { ok: false; reason: string } {
    return { ok: false, reason: "crafting_not_connected" };
  }
}

export class NullSkillPort implements SkillPort {
  useSkill(_playerId: string, _skillId: string, _logicalIndex: number): { ok: false; reason: string } {
    return { ok: false, reason: "skill_not_connected" };
  }
}

export class NullPlacementPort implements PlacementPort {
  place(_playerId: string, _blockId: string, _x: number, _y: number, _logicalIndex: number): { ok: false; reason: string } {
    return { ok: false, reason: "placement_not_connected" };
  }
}