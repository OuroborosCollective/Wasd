export interface AREState {
  resonance: number;
  phaseShift: number;
  tick: number;
  amplitude: number;
  metadata?: {
    [key: string]: any;
  };
}