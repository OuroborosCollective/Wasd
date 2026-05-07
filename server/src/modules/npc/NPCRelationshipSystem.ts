import { TerritoryControl } from "../guild/TerritoryControl.js";

export interface INPCTraits {
    faith: number;
    aggression: number;
}

export interface INPC {
    id: string;
    factionId: string;
    position: { x: number; y: number; z: number };
    traits: INPCTraits;
}

export class NPCRelationshipSystem {
    private static UPDATE_INTERVAL_MS: number = 60000;
    private static instance: NPCRelationshipSystem;
    private npcs: INPC[] = [];
    private interval: NodeJS.Timeout | null = null;

    private constructor() {}

    public static getInstance(): NPCRelationshipSystem {
        if (!NPCRelationshipSystem.instance) {
            NPCRelationshipSystem.instance = new NPCRelationshipSystem();
        }
        return NPCRelationshipSystem.instance;
    }

    public registerNPCs(npcs: INPC[]): void {
        this.npcs = npcs;
    }

    public startSystem(): void {
        if (this.interval) return;
        this.interval = setInterval(() => this.updateCycle(), NPCRelationshipSystem.UPDATE_INTERVAL_MS);
    }

    public stopSystem(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private updateCycle(): void {
        for (const npc of this.npcs) {
            this.applySovereigntyInfluence(npc);
        }
    }

    private applySovereigntyInfluence(npc: INPC): void {
        const sovereignty = TerritoryControl.applyGuildSovereignty(npc.position);

        if (!sovereignty || !sovereignty.factionId) {
            this.applyNeutralDecay(npc);
            return;
        }

        const isOwnedByFaction = sovereignty.factionId === npc.factionId;
        this.recalculateTraits(npc, isOwnedByFaction, sovereignty.influenceLevel || 1.0);
    }

    private recalculateTraits(npc: INPC, isFriendly: boolean, influence: number): void {
        if (isFriendly) {
            npc.traits.faith = Math.min(1.0, npc.traits.faith + (0.02 * influence));
            npc.traits.aggression = Math.max(0.0, npc.traits.aggression - (0.01 * influence));
        } else {
            npc.traits.faith = Math.max(0.0, npc.traits.faith - (0.015 * influence));
            npc.traits.aggression = Math.min(1.0, npc.traits.aggression + (0.025 * influence));
        }
    }

    private applyNeutralDecay(npc: INPC): void {
        if (npc.traits.faith > 0.5) npc.traits.faith -= 0.005;
        if (npc.traits.aggression > 0.5) npc.traits.aggression -= 0.005;
    }
}