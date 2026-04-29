export enum QuestType {
    Combat = 'Combat',
    Collect = 'Collect',
    Talk = 'Talk'
}

export interface NPCEchoProfile {
    id: string;
    type: QuestType;
    position: { x: number; y: number };
}

export class QuestEchoSystem {
    private readonly intensities: Record<QuestType, number> = {
        [QuestType.Combat]: 0.95,
        [QuestType.Collect]: 0.80,
        [QuestType.Talk]: 0.70
    };

    public getAttractionForce(type: QuestType): number {
        return this.intensities[type] || 0;
    }

    public calculateInfluence(npc: NPCEchoProfile, targetPosition: { x: number; y: number }): number {
        const distance = Math.sqrt(
            Math.pow(targetPosition.x - npc.position.x, 2) + 
            Math.pow(targetPosition.y - npc.position.y, 2)
        );
        
        const baseIntensity = this.getAttractionForce(npc.type);
        
        if (distance === 0) return baseIntensity;
        
        return baseIntensity / (1 + distance);
    }

    public getAllIntensities(): Record<QuestType, number> {
        return { ...this.intensities };
    }
}