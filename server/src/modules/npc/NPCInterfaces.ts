/**
 * NPCInterfaces — legacy surface used by experimental AI modules.
 */
export interface INPC {
  id: string;
  position: { x: number; y: number; z?: number };
  longTermGoal?: string;
  state?: string;
}

export interface NPCState {
  id: string;
  goals: string[];
}

export interface LongTermGoal {
  id: string;
  priority: number;
}

export interface NPCInterfaces {}
