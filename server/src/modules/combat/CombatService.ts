import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";
import { ComboValidator, type ComboResult } from "./ComboValidator.js";
import { runtimeValidation, validate } from "../../core/are/RuntimeValidation.js";

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

    constructor(private readonly clock: AREClock = new SystemAREClock()) {
        this.comboValidator = new ComboValidator(undefined, clock);
    }

    public handleSkillRequest(
        playerId: string,
        skill: Skill,
        currentState: CombatState
    ): CombatExecutionResult {
        // ─── Runtime Validation: Combat Skill Request ──────────────────────────────
        if (!playerId || typeof playerId !== "string" || playerId.length === 0) {
            console.warn("[RuntimeValidation] CombatService.handleSkillRequest: invalid playerId");
            return { damage: 0, newState: { comboIndex: 0, lastSkillId: null, lastTimestamp: 0 } };
        }
        
        if (!skill || typeof skill !== "object") {
            console.warn("[RuntimeValidation] CombatService.handleSkillRequest: invalid skill");
            return { damage: 0, newState: { comboIndex: 0, lastSkillId: null, lastTimestamp: 0 } };
        }
        
        if (!skill.id || typeof skill.id !== "string") {
            console.warn("[RuntimeValidation] CombatService.handleSkillRequest: missing skill.id");
        }
        
        if (typeof skill.baseDamage !== "number" || skill.baseDamage < 0) {
            console.warn(`[RuntimeValidation] CombatService.handleSkillRequest: invalid baseDamage ${skill.baseDamage}`);
        }
        
        if (!currentState || typeof currentState !== "object") {
            console.warn("[RuntimeValidation] CombatService.handleSkillRequest: invalid currentState");
            return { damage: 0, newState: { comboIndex: 0, lastSkillId: null, lastTimestamp: 0 } };
        }
        
        if (typeof currentState.comboIndex !== "number" || currentState.comboIndex < 0) {
            console.warn(`[RuntimeValidation] CombatService.handleSkillRequest: invalid comboIndex ${currentState.comboIndex}`);
        }
        // ─── End Runtime Validation ──────────────────────────────────────────────

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
        
        // Validate computed damage
        if (!Number.isFinite(finalDamage) || finalDamage < 0) {
            console.warn(`[RuntimeValidation] CombatService: computed invalid damage ${finalDamage}`);
        }

        const newState: CombatState = {
            comboIndex: nextIndex,
            lastSkillId: skill.id,
            lastTimestamp: this.clock.now()
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
