export interface IBountySystem {
    hasActiveBounty(playerId: string): boolean;
    getBountyLevel(playerId: string): number;
}

export interface INemesisSystem {
    isNemesisOf(playerId: string, npcId: string): boolean;
}

export interface IRelationshipData {
    baseHostility: number;
    reputation: number;
    lastInteraction: number;
}

export class NPCRelationshipSystem {
    private relationships: Map<string, Map<string, IRelationshipData>> = new Map();
    private bountySystem: IBountySystem;
    private nemesisSystem: INemesisSystem;

    private readonly BOUNTY_HOSTILITY_MODIFIER = 40;
    private readonly NEMESIS_HOSTILITY_MODIFIER = 100;
    private readonly MAX_HOSTILITY = 1000;

    constructor(bountySystem: IBountySystem, nemesisSystem: INemesisSystem) {
        this.bountySystem = bountySystem;
        this.nemesisSystem = nemesisSystem;
    }

    public getRelationship(npcId: string, playerId: string): IRelationshipData {
        if (!this.relationships.has(npcId)) {
            this.relationships.set(npcId, new Map());
        }
        const npcMap = this.relationships.get(npcId)!;
        if (!npcMap.has(playerId)) {
            npcMap.set(playerId, {
                baseHostility: 0,
                reputation: 0,
                lastInteraction: Date.now()
            });
        }
        return npcMap.get(playerId)!;
    }

    public calculateDynamicHostility(npcId: string, playerId: string): number {
        const data = this.getRelationship(npcId, playerId);
        let dynamicScore = data.baseHostility;

        if (this.bountySystem.hasActiveBounty(playerId)) {
            const bountyLevel = this.bountySystem.getBountyLevel(playerId);
            dynamicScore += (this.BOUNTY_HOSTILITY_MODIFIER * bountyLevel);
        }

        if (this.nemesisSystem.isNemesisOf(playerId, npcId)) {
            dynamicScore += this.NEMESIS_HOSTILITY_MODIFIER;
        }

        const reputationInfluence = data.reputation * -0.2;
        dynamicScore += reputationInfluence;

        return Math.min(this.MAX_HOSTILITY, Math.max(0, dynamicScore));
    }

    public updateBaseHostility(npcId: string, playerId: string, amount: number): void {
        const data = this.getRelationship(npcId, playerId);
        data.baseHostility += amount;
        data.lastInteraction = Date.now();
    }

    public setReputation(npcId: string, playerId: string, value: number): void {
        const data = this.getRelationship(npcId, playerId);
        data.reputation = value;
        data.lastInteraction = Date.now();
    }

    public isAggressiveTowards(npcId: string, playerId: string, threshold: number = 50): boolean {
        return this.calculateDynamicHostility(npcId, playerId) >= threshold;
    }

    public clearRelationship(npcId: string, playerId: string): void {
        if (this.relationships.has(npcId)) {
            this.relationships.get(npcId)?.delete(playerId);
        }
    }
}