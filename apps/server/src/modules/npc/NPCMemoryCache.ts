export interface HeuristicWeights {
    aggression: number;
    sociability: number;
    curiosity: number;
    survival: number;
}

export interface NPCMemoryState {
    npcId: string;
    currentGoal: string | null;
    observations: string[];
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }[];
    weights: HeuristicWeights;
    lastUpdate: number;
}

export class NPCMemoryCache {
    private cache: Map<string, NPCMemoryState> = new Map();
    private dirtyKeys: Set<string> = new Set();

    public get(npcId: string): NPCMemoryState | undefined {
        return this.cache.get(npcId);
    }

    public hydrate(npcId: string, state: NPCMemoryState): void {
        this.cache.set(npcId, state);
        // Hydration from DB usually shouldn't mark the entry as dirty immediately
    }

    public setGoal(npcId: string, goal: string | null): void {
        const state = this.ensureState(npcId);
        state.currentGoal = goal;
        state.lastUpdate = Date.now();
        this.dirtyKeys.add(npcId);
    }

    public recordChat(npcId: string, role: 'user' | 'assistant' | 'system', content: string): void {
        const state = this.ensureState(npcId);
        state.chatHistory.push({
            role,
            content,
            timestamp: Date.now()
        });

        if (state.chatHistory.length > 50) {
            state.chatHistory.shift();
        }

        state.lastUpdate = Date.now();
        this.dirtyKeys.add(npcId);
    }

    public observe(npcId: string, observation: string): void {
        const state = this.ensureState(npcId);
        state.observations.push(observation);

        if (state.observations.length > 20) {
            state.observations.shift();
        }

        state.lastUpdate = Date.now();
        this.dirtyKeys.add(npcId);
    }

    public getDirtyEntries(): NPCMemoryState[] {
        const entries: NPCMemoryState[] = [];
        for (const id of this.dirtyKeys) {
            const state = this.cache.get(id);
            if (state) {
                entries.push(state);
            }
        }
        return entries;
    }

    public markSaved(npcIds: string[]): void {
        for (const id of npcIds) {
            this.dirtyKeys.delete(id);
        }
    }

    private ensureState(npcId: string): NPCMemoryState {
        let state = this.cache.get(npcId);
        if (!state) {
            state = {
                npcId,
                currentGoal: null,
                observations: [],
                chatHistory: [],
                weights: {
                    aggression: 0.5,
                    sociability: 0.5,
                    curiosity: 0.5,
                    survival: 0.5
                },
                lastUpdate: Date.now()
            };
            this.cache.set(npcId, state);
        }
        return state;
    }
}