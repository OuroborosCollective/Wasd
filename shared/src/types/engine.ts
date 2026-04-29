export interface AREInput {
  tick: number;
  payload: Record<string, any>;
  clientId: string;
}

export interface AREState {
  tick: number;
  entities: Record<string, any>;
  checksum: string;
}

export interface AREDeltaSnapshot {
  fromTick: number;
  toTick: number;
  stateDiff: Record<string, any>;
  checksum: string;
}

export interface IAREEngineHost {
  onTick: (state: AREState, inputs: AREInput[]) => void;
  getState: () => AREState;
  applyInput: (input: AREInput) => void;
  step: () => void;
}