export enum NemesisLevel {
    STABLE = "STABLE",
    UNSTABLE = "UNSTABLE",
    THREAT = "THREAT",
    GLOBAL_MENACE = "GLOBAL_MENACE",
    EXTINCTION_EVENT = "EXTINCTION_EVENT"
}

export interface HistoryTrigger {
    type: "combat_kill";
    timestamp: number;
    metadata: {
        victimId: string;
        attackerId: string;
        coordinates: { x: number; y: number; z: number };
        damageType: string;
        overkill: boolean;
    };
}

export interface BountyEntry {
    id: string;
    targetId: string;
    factionId: string;
    reward: {
        currency: number;
        reputation: number;
        items?: string[];
    };
    severity: NemesisLevel;
    history: HistoryTrigger[];
    issuedAt: number;
    expiresAt?: number;
    status: "OPEN" | "CLAIMED" | "EXPIRED" | "REVOKED";
}

export type BountySummary = Pick<BountyEntry, "id" | "targetId" | "reward" | "severity">;