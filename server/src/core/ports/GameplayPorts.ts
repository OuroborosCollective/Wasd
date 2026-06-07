export interface CraftingPort {
  craft(playerId: string, recipeId: string, logicalIndex: number): { ok: true; result: unknown } | { ok: false; reason: string };
}

export interface SkillPort {
  useSkill(playerId: string, skillId: string, logicalIndex: number): { ok: true; result: unknown } | { ok: false; reason: string };
}

export interface PlacementPort {
  place(playerId: string, blockId: string, x: number, y: number, logicalIndex: number): { ok: true; result: unknown } | { ok: false; reason: string };
}