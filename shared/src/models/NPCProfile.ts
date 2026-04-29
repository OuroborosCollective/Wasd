export enum AdaptiveProfile {
    Combat = "Combat",
    Civil = "Civil",
    Builder = "Builder"
}

export interface NPCProfile {
    id: string;
    name: string;
    adaptiveProfile: AdaptiveProfile;
    plexityValue: number;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    historyRef: string;
}

export const createDefaultNPCProfile = (id: string, name: string): NPCProfile => ({
    id,
    name,
    adaptiveProfile: AdaptiveProfile.Civil,
    plexityValue: 0.0,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    historyRef: ""
});