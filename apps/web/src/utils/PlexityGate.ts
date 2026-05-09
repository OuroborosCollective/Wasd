export enum DeviceTier { LOW = 0, MEDIUM = 1, HIGH = 2, ULTRA = 3, MOBILE = 4 }
export class PlexityGate {
    public static determineOptimalRenderer(): any { return "babylon"; }
}
export interface DeviceProfile { tier: DeviceTier; }
