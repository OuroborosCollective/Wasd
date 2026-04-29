export interface ComboDefinition {
    nextSkills: string[];
    windowMs: number;
}

export interface PlayerComboState {
    lastSkillId: string;
    lastIndex: number;
    lastTimestamp: number;
}

export class ComboValidator {
    private comboDefinitions: Map<string, ComboDefinition>;
    private playerStates: Map<string, PlayerComboState>;

    constructor(definitions: Map<string, ComboDefinition> = new Map()) {
        this.comboDefinitions = definitions;
        this.playerStates = new Map();
    }

    public validateSequence(playerId: string, skillId: string, clientLogicalIndex: number): void {
        const serverTime = Date.now();
        const currentState = this.playerStates.get(playerId);

        if (clientLogicalIndex === 0) {
            this.playerStates.set(playerId, {
                lastSkillId: skillId,
                lastIndex: 0,
                lastTimestamp: serverTime
            });
            return;
        }

        if (!currentState) {
            throw new Error(`VALIDATION_FAILED: No active combo sequence found for player ${playerId}. Expected index 0, received ${clientLogicalIndex}.`);
        }

        if (clientLogicalIndex !== currentState.lastIndex + 1) {
            throw new Error(`VALIDATION_FAILED: Out of order sequence for player ${playerId}. Expected index ${currentState.lastIndex + 1}, received ${clientLogicalIndex}.`);
        }

        const definition = this.comboDefinitions.get(currentState.lastSkillId);
        if (!definition) {
            this.playerStates.delete(playerId);
            throw new Error(`VALIDATION_FAILED: No combo definition exists for skill ${currentState.lastSkillId}.`);
        }

        if (!definition.nextSkills.includes(skillId)) {
            this.playerStates.delete(playerId);
            throw new Error(`VALIDATION_FAILED: Illegal skill transition. ${skillId} is not a valid follow-up for ${currentState.lastSkillId}.`);
        }

        const timeDiff = serverTime - currentState.lastTimestamp;
        if (timeDiff > definition.windowMs) {
            this.playerStates.delete(playerId);
            throw new Error(`VALIDATION_FAILED: Combo window expired for player ${playerId}. Time delta ${timeDiff}ms exceeds allowed window of ${definition.windowMs}ms.`);
        }

        this.playerStates.set(playerId, {
            lastSkillId: skillId,
            lastIndex: clientLogicalIndex,
            lastTimestamp: serverTime
        });
    }

    public resetCombo(playerId: string): void {
        this.playerStates.delete(playerId);
    }

    public registerDefinition(skillId: string, definition: ComboDefinition): void {
        this.comboDefinitions.set(skillId, definition);
    }
}