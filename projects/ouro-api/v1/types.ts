export type BeliefValue = string | number | boolean;

export interface BeliefMap {
  [key: string]: BeliefValue;
}

export interface NeedSystem {
  [parameter: string]: number;
}

export interface Action {
  type: string;
  payload: any;
  weight: number;
}

export interface AgentState {
  past: Action[];
  legend: string;
  beliefs: BeliefMap;
  needs: NeedSystem;
}