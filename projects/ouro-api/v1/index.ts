export interface AgentNeeds {
    hunger: number;
    thirst: number;
    energy: number;
    social: number;
    hygiene: number;
    update(deltaTime: number): void;
    isCritical(): boolean;
    getState(): Record<string, number>;
}

export interface NPCMemoryCache {
    capacity: number;
    entryCount: number;
    store(id: string, data: any, importance: number): void;
    recall(id: string): any | null;
    forget(id: string): boolean;
    clear(): void;
    getRelevantMemories(context: string): any[];
}

export interface AgentBrain {
    id: string;
    version: string;
    memory: NPCMemoryCache;
    needs: AgentNeeds;
    processSensoryInput(input: any): Promise<void>;
    decideNextAction(): Promise<string>;
    executeAction(actionId: string): void;
}

export class OuroAgentNeeds implements AgentNeeds {
    constructor(
        public hunger: number = 100,
        public thirst: number = 100,
        public energy: number = 100,
        public social: number = 100,
        public hygiene: number = 100
    ) {}

    update(deltaTime: number): void {
        this.hunger -= 0.1 * deltaTime;
        this.thirst -= 0.15 * deltaTime;
        this.energy -= 0.05 * deltaTime;
        this.social -= 0.08 * deltaTime;
        this.hygiene -= 0.03 * deltaTime;
    }

    isCritical(): boolean {
        return this.hunger < 20 || this.thirst < 20 || this.energy < 10;
    }

    getState(): Record<string, number> {
        return {
            hunger: this.hunger,
            thirst: this.thirst,
            energy: this.energy,
            social: this.social,
            hygiene: this.hygiene
        };
    }
}

export class OuroMemoryCache implements NPCMemoryCache {
    private storage: Map<string, { data: any; importance: number; timestamp: number }> = new Map();

    constructor(public capacity: number = 1000) {}

    get entryCount(): number {
        return this.storage.size;
    }

    store(id: string, data: any, importance: number): void {
        if (this.storage.size >= this.capacity) {
            const leastImportant = Array.from(this.storage.entries())
                .sort((a, b) => a[1].importance - b[1].importance)[0][0];
            this.storage.delete(leastImportant);
        }
        this.storage.set(id, { data, importance, timestamp: Date.now() });
    }

    recall(id: string): any | null {
        return this.storage.get(id)?.data || null;
    }

    forget(id: string): boolean {
        return this.storage.delete(id);
    }

    clear(): void {
        this.storage.clear();
    }

    getRelevantMemories(context: string): any[] {
        return Array.from(this.storage.values())
            .filter(m => m.importance > 50)
            .map(m => m.data);
    }
}

export class OuroAgentBrain implements AgentBrain {
    constructor(
        public id: string,
        public memory: NPCMemoryCache,
        public needs: AgentNeeds,
        public version: string = "1.0.0"
    ) {}

    async processSensoryInput(input: any): Promise<void> {
        this.memory.store(Date.now().toString(), input, 10);
    }

    async decideNextAction(): Promise<string> {
        if (this.needs.isCritical()) {
            const state = this.needs.getState();
            if (state.hunger < 20) return "SEARCH_FOOD";
            if (state.thirst < 20) return "SEARCH_WATER";
            if (state.energy < 10) return "SLEEP";
        }
        return "IDLE";
    }

    executeAction(actionId: string): void {
        console.log(`Agent ${this.id} executing: ${actionId}`);
    }
}

export const createAgent = (id: string): AgentBrain => {
    return new OuroAgentBrain(
        id,
        new OuroMemoryCache(),
        new OuroAgentNeeds()
    );
};