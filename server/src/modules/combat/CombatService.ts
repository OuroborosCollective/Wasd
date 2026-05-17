import { ComboValidator, type ComboResult } from "./ComboValidator.js";

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
        currentState: CombatState,
        timestamp?: number
    ): CombatExecutionResult {
        const entityState = {
            entityId: playerId,
            logicalIndex: currentState.comboIndex,
            position: { x: 0, y: 0, z: 0 },
            health: 100,
            buffStates: new Map<string, number>(),
        };
        const comboResult: ComboResult = this.comboValidator.validateAgainstState(
            playerId,
            skill.id,
            currentState.comboIndex,
            entityState,
            undefined,
            undefined,
            timestamp
        );

        let damageMultiplier = 1.0;
        let nextIndex = 0;

        if (comboResult.valid) {
            damageMultiplier = 1 + comboResult.extraDamage / Math.max(1, skill.baseDamage);
            nextIndex = comboResult.serverLogicalIndex + 1;
        } else {
            nextIndex = 0;
        }

        const finalDamage = skill.baseDamage * damageMultiplier;

        const newState: CombatState = {
            comboIndex: nextIndex,
            lastSkillId: skill.id,
            lastTimestamp: timestamp ?? this.comboValidator.getServerTimestamp()
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