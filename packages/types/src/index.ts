export type BaseId = string | number;
export interface AREPayload {
  timestamp: number; sequenceId: number; entities: any[];
  worldData: { resonance: number; weather: string; time: number; };
}
