export enum FactionType {
    NEUTRAL = "NEUTRAL",
    HOSTILE = "HOSTILE",
    FRIENDLY = "FRIENDLY",
    RELIGIOUS = "RELIGIOUS"
}

export interface INPCStats {
    faith: number;
    aggression: number;
}

export interface IFactionLegend {
    type: FactionType;
    description: string;
    factionId: string;
}