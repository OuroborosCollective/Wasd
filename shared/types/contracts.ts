export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface IContract {
    typeValue: number;
    currentHp: number;
    maxHp: number;
    inverseResonance: number;
    location: Vector3;
    isClaiming: boolean;
    claimerId: string | null;
    isClaimed: boolean;
}