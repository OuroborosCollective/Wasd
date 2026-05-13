import { EventEmitter } from 'events';

/** Legacy interfaces - kept for compatibility */
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

import { EventEmitter } from 'events';

export interface MemoryEntry {
    timestamp: number;
    type: MemoryType;
    content: string;
    intensity: number;
}

export enum MemoryType {
    Experience = 'experience',
    Interaction = 'interaction',
    Achievement = 'achievement',
    Failure = 'failure',
    Observation = 'observation'
}

export interface AgentNeeds {
    hunger: number;
    energy: number;
    social: number;
    curiosity: number;
    safety: number;
    [key: string]: number;
}

export interface AgentBeliefs {
    worldModel: Record<string, number>;
    socialModel: Record<string, number>;
    selfModel: Record<string, number>;
    legend: string;
}

export interface AgentAction {
    type: ActionType;
    target?: string;
    parameters: Record<string, any>;
    reasoning: string;
    confidence: number;
}

export enum ActionType {
    Idle = 'idle',
    Explore = 'explore',
    Interact = 'interact',
    Rest = 'rest',
    Eat = 'eat',
    Communicate = 'communicate',
    Learn = 'learn',
    Defend = 'defend'
}

export interface AREState {
    tick: number;
    resonance: number;
    phaseShift: number;
    aggression: number;
    faith: number;
    timestamp: number;
}

export interface AgentRequest {
    agentId: string;
    inputs: Record<string, any>;
    context?: Record<string, any>;
}

export interface AgentResponse {
    agentId: string;
    action: AgentAction;
    state: AREState;
    reasoning: string;
    needs: AgentNeeds;
    beliefs: AgentBeliefs;
}

export class NPCMemoryCache {
    private memories: Map<string, MemoryEntry[]> = new Map();
    private maxMemories: number = 1000;

    public addMemory(agentId: string, entry: MemoryEntry): void {
        const agentMemories = this.memories.get(agentId) || [];
        agentMemories.push(entry);
        if (agentMemories.length > this.maxMemories) agentMemories.shift();
        this.memories.set(agentId, agentMemories);
    }

    public extractHistory(agentId: string, limit: number = 100): MemoryEntry[] {
        return (this.memories.get(agentId) || []).slice(-limit);
    }

    public getMemoriesByType(agentId: string, type: MemoryType): MemoryEntry[] {
        return (this.memories.get(agentId) || []).filter(m => m.type === type);
    }

    public getRecentMemories(agentId: string, since: number): MemoryEntry[] {
        return (this.memories.get(agentId) || []).filter(m => m.timestamp >= since);
    }

    public clearMemories(agentId: string): void {
        this.memories.delete(agentId);
    }

    public getMemoryCount(agentId: string): number {
        return (this.memories.get(agentId) || []).length;
    }
}

export class AgentNeedsSystem {
    private needs: Map<string, AgentNeeds> = new Map();
    private decayRates: Map<string, number> = new Map();
    private thresholds: Map<string, { critical: number; satisfied: number }> = new Map();

    constructor() {
        this.thresholds.set('hunger', { critical: 20, satisfied: 80 });
        this.thresholds.set('energy', { critical: 20, satisfied: 80 });
        this.thresholds.set('social', { critical: 30, satisfied: 70 });
        this.thresholds.set('curiosity', { critical: 30, satisfied: 70 });
        this.thresholds.set('safety', { critical: 25, satisfied: 75 });
        this.decayRates.set('hunger', 0.5);
        this.decayRates.set('energy', 0.3);
        this.decayRates.set('social', 0.2);
        this.decayRates.set('curiosity', 0.1);
        this.decayRates.set('safety', 0.05);
    }

    public initializeNeeds(agentId: string): void {
        this.needs.set(agentId, { hunger: 100, energy: 100, social: 50, curiosity: 50, safety: 80 });
    }

    public getNeeds(agentId: string): AgentNeeds {
        return this.needs.get(agentId) || { hunger: 0, energy: 0, social: 0, curiosity: 0, safety: 0 };
    }

    public updateNeeds(agentId: string): AgentNeeds {
        const needs = this.needs.get(agentId);
        if (!needs) return this.getNeeds(agentId);
        for (const [need, decay] of this.decayRates) needs[need] = Math.max(0, needs[need] - decay);
        this.needs.set(agentId, needs);
        return needs;
    }

    public satisfyNeed(agentId: string, need: string, amount: number): void {
        const needs = this.needs.get(agentId);
        if (needs && needs[need] !== undefined) {
            needs[need] = Math.min(100, needs[need] + amount);
            this.needs.set(agentId, needs);
        }
    }

    public getMostUrgentNeed(agentId: string): string | null {
        const needs = this.needs.get(agentId);
        if (!needs) return null;
        let urgent: string | null = null, lowest = 101;
        for (const [need, value] of Object.entries(needs)) {
            const threshold = this.thresholds.get(need);
            if (threshold && value < threshold.critical && value < lowest) { urgent = need; lowest = value; }
        }
        return urgent;
    }

    public isCritical(agentId: string, need: string): boolean {
        const needs = this.needs.get(agentId);
        const threshold = this.thresholds.get(need);
        return !!(needs && threshold && needs[need] < threshold.critical);
    }
}

export class AREStateCompiler {
    private tick: number = 0;

    public compile(inputs: Record<string, any>, beliefs: AgentBeliefs): AREState {
        this.tick++;
        const resonance = Object.values(beliefs.worldModel).length ? Object.values(beliefs.worldModel).reduce((a, b) => a + b, 0) / Object.values(beliefs.worldModel).length : 0;
        return {
            tick: this.tick,
            resonance,
            phaseShift: (this.tick % 100) / 100,
            aggression: Math.max(0, Math.min(1, beliefs.selfModel['aggression'] || 0)),
            faith: Math.max(0, Math.min(1, beliefs.socialModel['trust'] || 0.5)),
            timestamp: Date.now()
        };
    }

    public reset(): void { this.tick = 0; }
    public getTick(): number { return this.tick; }
}

export class LegendProvider {
    public distill(memories: MemoryEntry[]): string {
        if (memories.length === 0) return 'The journey begins...';
        const achievements = memories.filter(m => m.type === MemoryType.Achievement);
        const failures = memories.filter(m => m.type === MemoryType.Failure);
        let legend = 'A tale of ';
        if (achievements.length > failures.length) legend += 'triumph and discovery. ';
        else if (failures.length > achievements.length) legend += 'hardship and perseverance. ';
        else legend += 'balance and growth. ';
        return legend;
    }
}

export class BeliefSystem {
    private beliefs: Map<string, AgentBeliefs> = new Map();

    public updateBeliefs(agentId: string, legend: string): void {
        const current = this.beliefs.get(agentId) || this.createDefaultBeliefs();
        if (legend.includes('triumph')) current.selfModel['confidence'] = (current.selfModel['confidence'] || 0.5) + 0.1;
        if (legend.includes('hardship')) current.selfModel['resilience'] = (current.selfModel['resilience'] || 0.5) + 0.1;
        current.legend = legend;
        this.beliefs.set(agentId, current);
    }

    public getBeliefs(agentId: string): AgentBeliefs {
        return this.beliefs.get(agentId) || this.createDefaultBeliefs();
    }

    private createDefaultBeliefs(): AgentBeliefs {
        return { worldModel: {}, socialModel: {}, selfModel: { confidence: 0.5, resilience: 0.5 }, legend: '' };
    }
}

export class ActionPlanner {
    public decideAction(needs: AgentNeeds, beliefs: AgentBeliefs): AgentAction {
        if (needs.hunger < 20) return { type: ActionType.Eat, parameters: {}, reasoning: 'Hunger critical', confidence: 0.9 };
        if (needs.energy < 20) return { type: ActionType.Rest, parameters: {}, reasoning: 'Energy depleted', confidence: 0.9 };
        if (needs.safety < 25) return { type: ActionType.Defend, parameters: {}, reasoning: 'Safety threatened', confidence: 0.8 };
        if (needs.curiosity > 60) return { type: ActionType.Explore, parameters: { area: 'unknown' }, reasoning: 'Curiosity compels exploration', confidence: 0.7 };
        if (needs.social < 30) return { type: ActionType.Communicate, parameters: {}, reasoning: 'Social connection needed', confidence: 0.7 };
        return { type: ActionType.Idle, parameters: {}, reasoning: 'All needs satisfied', confidence: 0.5 };
    }
}

export class AgentBrain extends EventEmitter {
    private memoryCache: NPCMemoryCache;
    private needsSystem: AgentNeedsSystem;
    private compiler: AREStateCompiler;
    private legendProvider: LegendProvider;
    private beliefSystem: BeliefSystem;
    private actionPlanner: ActionPlanner;

    constructor() {
        super();
        this.memoryCache = new NPCMemoryCache();
        this.needsSystem = new AgentNeedsSystem();
        this.compiler = new AREStateCompiler();
        this.legendProvider = new LegendProvider();
        this.beliefSystem = new BeliefSystem();
        this.actionPlanner = new ActionPlanner();
    }

    public processRequest(request: AgentRequest): AgentResponse {
        const { agentId, inputs } = request;
        if (!this.needsSystem.getNeeds(agentId).hunger) this.needsSystem.initializeNeeds(agentId);

        const history = this.memoryCache.extractHistory(agentId);
        const legend = this.legendProvider.distill(history);
        this.beliefSystem.updateBeliefs(agentId, legend);
        const needs = this.needsSystem.getNeeds(agentId);
        const beliefs = this.beliefSystem.getBeliefs(agentId);
        const state = this.compiler.compile(inputs, beliefs);
        const updatedNeeds = this.needsSystem.updateNeeds(agentId);
        const action = this.actionPlanner.decideAction(updatedNeeds, beliefs);

        this.memoryCache.addMemory(agentId, {
            timestamp: Date.now(),
            type: MemoryType.Experience,
            content: `Action: ${action.type} - ${action.reasoning}`,
            intensity: action.confidence
        });

        this.emit('action', { agentId, action, state });
        return { agentId, action, state, reasoning: action.reasoning, needs: updatedNeeds, beliefs };
    }

    public async processCycle(agentId: string): Promise<AgentResponse> {
        return this.processRequest({ agentId, inputs: {}, context: {} });
    }

    public getMemoryCache(): NPCMemoryCache { return this.memoryCache; }
    public getNeedsSystem(): AgentNeedsSystem { return this.needsSystem; }
}

export default AgentBrain;
export { MemoryType, ActionType };
export { NPCMemoryCache, AgentNeedsSystem, AREStateCompiler, LegendProvider, BeliefSystem, ActionPlanner };