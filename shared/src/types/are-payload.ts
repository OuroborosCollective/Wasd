export type AREPayload = {
  kappa?: number;
  logicalIndex?: number;
  phaseShift?: number;
  resonance?: number;
  plexity?: number;
  chain?: string;
  kappaPos?: { x: number; y: number; z: number };
  tick?: number;
  timestamp?: number;
  data?: any;
};

export interface Vector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface Quaternion {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
}
