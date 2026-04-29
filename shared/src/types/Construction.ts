export enum ConstructionRole {
    BUILDER = 'BUILDER',
    ENGINEER = 'ENGINEER'
}

export interface IConstructionContract {
    position: {
        x: number;
        y: number;
        z: number;
    };
    progress: number;
    factionId: string;
    claimedBy: string | null;
}