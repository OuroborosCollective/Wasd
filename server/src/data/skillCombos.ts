// @ts-nocheck
export interface SkillComboEntry {
    previousSkillId: string;
    nextSkillId: string;
    windowStartMs: number;
    windowEndMs: number;
    bonusMultiplier: number;
}

export const SKILL_COMBOS: SkillComboEntry[] = [
    {
        previousSkillId: 'ember_bolt',
        nextSkillId: 'impact_buster',
        windowStartMs: 400,
        windowEndMs: 800,
        bonusMultiplier: 1.25
    }
];

export class SkillComboRepository {
    public static getComboByPreviousSkill(skillId: string): SkillComboEntry | undefined {
        return SKILL_COMBOS.find(combo => combo.previousSkillId === skillId);
    }

    public static isValidTiming(skillId: string, nextSkillId: string, timeDiffMs: number): boolean {
        const combo = SKILL_COMBOS.find(
            c => c.previousSkillId === skillId && c.nextSkillId === nextSkillId
        );
        
        if (!combo) return false;
        
        return timeDiffMs >= combo.windowStartMs && timeDiffMs <= combo.windowEndMs;
    }

    public static getBonusMultiplier(skillId: string, nextSkillId: string): number {
        const combo = SKILL_COMBOS.find(
            c => c.previousSkillId === skillId && c.nextSkillId === nextSkillId
        );
        return combo ? combo.bonusMultiplier : 1.0;
    }
}