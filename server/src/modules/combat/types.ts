export interface SkillCombo {
  sourceSkillId: string;
  targetSkillId: string;
  windowMs: number;
  bonusMultiplier: number;
}

export interface CombatState {
  logicalIndex: number;
  lastSkillId: string | null;
  lastTimestamp: number;
}