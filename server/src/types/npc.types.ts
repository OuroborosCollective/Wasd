export interface NPCMemory {
    longTermGoals: string[];
}

export interface NPC {
    id: string;
    name: string;
    state: string;
    stateTimer: number;
    memory: NPCMemory;
}