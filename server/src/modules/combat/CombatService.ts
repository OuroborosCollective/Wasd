import { ComboValidator, ComboResult } from "./ComboValidator";

export interface CombatState {
    comboIndex: number;
    lastSkillId: string | null;
    lastTimestamp: number;
}

export interface Skill {
    id: string;
    baseDamage: number;
}

export interface CombatExecutionResult {
    damage: number;
    newState: CombatState;
}

export class CombatService {
    private comboValidator: ComboValidator;

    constructor() {
        this.comboValidator = new ComboValidator();
    }

    public handleSkillRequest(
        playerId: string,
        skill: Skill,
        currentState: CombatState
    ): CombatExecutionResult {
        const comboResult: ComboResult = this.comboValidator.validate(skill, currentState);

        let damageMultiplier = 1.0;
        let nextIndex = 0;

        if (comboResult.isValid) {
            damageMultiplier = comboResult.multiplier;
            nextIndex = comboResult.nextIndex;
        } else {
            nextIndex = 0;
        }

        const finalDamage = skill.baseDamage * damageMultiplier;

        const newState: CombatState = {
            comboIndex: nextIndex,
            lastSkillId: skill.id,
            lastTimestamp: Date.now()
        };

        this.updatePlayerCombatState(playerId, newState);

        return {
            damage: finalDamage,
            newState: newState
        };
    }

    private updatePlayerCombatState(playerId: string, newState: CombatState): void {
        // Logic for persisting the state to a database or cache would be implemented here
    }
}