export interface IMemoryCache {
    extractHistory(agentId: string): Promise<any[]>;
}

export interface ILegendProvider {
    distill(history: any[]): Promise<string>;
}

export interface IBeliefSystem {
    updateBeliefs(legend: string): Promise<void>;
    getNeeds(): Promise<Record<string, number>>;
    getBeliefs(): Promise<Record<string, any>>;
}

export interface IActionPlanner {
    decideAction(needs: Record<string, number>, beliefs: Record<string, any>): Promise<any>;
}

export interface IPersistence {
    commitAction(agentId: string, action: any): Promise<void>;
}

export class AgentBrain {
    private memoryCache: IMemoryCache;
    private legendProvider: ILegendProvider;
    private beliefSystem: IBeliefSystem;
    private actionPlanner: IActionPlanner;
    private persistence: IPersistence;

    constructor(
        memoryCache: IMemoryCache,
        legendProvider: ILegendProvider,
        beliefSystem: IBeliefSystem,
        actionPlanner: IActionPlanner,
        persistence: IPersistence
    ) {
        this.memoryCache = memoryCache;
        this.legendProvider = legendProvider;
        this.beliefSystem = beliefSystem;
        this.actionPlanner = actionPlanner;
        this.persistence = persistence;
    }

    /**
     * Orchestriert den vollständigen Prozess-Zyklus des Agenten.
     * @param agentId Die eindeutige Kennung des Agenten.
     */
    public async processCycle(agentId: string): Promise<void> {
        try {
            // 1. History-Extraktion via memoryCache
            const history = await this.memoryCache.extractHistory(agentId);

            // 2. Legend-Destillation via LegendProvider
            const legend = await this.legendProvider.distill(history);

            // 3. Belief-Update
            await this.beliefSystem.updateBeliefs(legend);

            // 4. Action-Entscheidung basierend auf Needs/Beliefs
            const needs = await this.beliefSystem.getNeeds();
            const beliefs = await this.beliefSystem.getBeliefs();
            
            const action = await this.actionPlanner.decideAction(needs, beliefs);

            // 5. Persistence via commitAction
            await this.persistence.commitAction(agentId, action);
            
        } catch (error) {
            this.handleCycleError(error);
            throw error;
        }
    }

    private handleCycleError(error: unknown): void {
        // Interne Fehlerbehandlung ohne Emotionen
        console.error(`[AgentBrain] Cycle failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}