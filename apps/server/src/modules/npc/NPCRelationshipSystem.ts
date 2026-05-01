export class NPCRelationshipSystem {
    private static instance: NPCRelationshipSystem;
    private relationships: Map<string, Map<string, number>> = new Map();

    public constructor() {}

    public static getInstance(): NPCRelationshipSystem {
        if (!NPCRelationshipSystem.instance) {
            NPCRelationshipSystem.instance = new NPCRelationshipSystem();
        }
        return NPCRelationshipSystem.instance;
    }

    public adjustAffinity(npcId: string, playerId: string, amount: number): void {
        if (!this.relationships.has(npcId)) {
            this.relationships.set(npcId, new Map());
        }
        
        const npcMap = this.relationships.get(npcId)!;
        const currentAffinity = npcMap.get(playerId) || 0;
        npcMap.set(playerId, currentAffinity + amount);
    }

    public getAffinity(npcId: string, playerId: string): number {
        const npcMap = this.relationships.get(npcId);
        if (!npcMap) return 0;
        return npcMap.get(playerId) || 0;
    }

    public setAffinity(npcId: string, playerId: string, value: number): void {
        if (!this.relationships.has(npcId)) {
            this.relationships.set(npcId, new Map());
        }
        this.relationships.get(npcId)!.set(playerId, value);
    }
}