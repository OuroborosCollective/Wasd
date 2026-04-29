export enum NeedType {
    Hunger = "HUNGER",
    Safety = "SAFETY",
    Social = "SOCIAL"
}

export interface NeedState {
    value: number;
    weight: number;
    decayRate: number;
    threshold: number;
}

export interface AgentNeedsConfig {
    initialHunger?: number;
    initialSafety?: number;
    initialSocial?: number;
    hungerDecay?: number;
    safetyDecay?: number;
    socialDecay?: number;
    threshold?: number;
}

export class AgentNeeds {
    private needs: Map<NeedType, NeedState>;
    private readonly MIN_VALUE = 0;
    private readonly MAX_VALUE = 100;

    constructor(config: AgentNeedsConfig = {}) {
        this.needs = new Map();
        
        this.needs.set(NeedType.Hunger, {
            value: config.initialHunger ?? 100,
            weight: 0,
            decayRate: config.hungerDecay ?? 0.5,
            threshold: config.threshold ?? 30
        });

        this.needs.set(NeedType.Safety, {
            value: config.initialSafety ?? 100,
            weight: 0,
            decayRate: config.safetyDecay ?? 0.2,
            threshold: config.threshold ?? 30
        });

        this.needs.set(NeedType.Social, {
            value: config.initialSocial ?? 100,
            weight: 0,
            decayRate: config.socialDecay ?? 0.3,
            threshold: config.threshold ?? 30
        });

        this.updateWeights();
    }

    public update(deltaTime: number = 1.0): void {
        for (const [type, state] of this.needs.entries()) {
            state.value = Math.max(this.MIN_VALUE, state.value - (state.decayRate * deltaTime));
        }
        this.updateWeights();
    }

    public fulfill(type: NeedType, amount: number): void {
        const state = this.needs.get(type);
        if (state) {
            state.value = Math.min(this.MAX_VALUE, state.value + amount);
            this.updateWeights();
        }
    }

    public getUrgentNeeds(): NeedType[] {
        const urgent: NeedType[] = [];
        for (const [type, state] of this.needs.entries()) {
            if (state.value <= state.threshold) {
                urgent.push(type);
            }
        }
        return urgent.sort((a, b) => (this.needs.get(b)?.weight ?? 0) - (this.needs.get(a)?.weight ?? 0));
    }

    public getDominantNeed(): NeedType {
        let maxWeight = -1;
        let dominant = NeedType.Hunger;

        for (const [type, state] of this.needs.entries()) {
            if (state.weight > maxWeight) {
                maxWeight = state.weight;
                dominant = type;
            }
        }
        return dominant;
    }

    private updateWeights(): void {
        let totalInversion = 0;
        const inversions: Map<NeedType, number> = new Map();

        for (const [type, state] of this.needs.entries()) {
            const invertedValue = this.MAX_VALUE - state.value;
            const exponentialPressure = Math.pow(invertedValue / 10, 2);
            inversions.set(type, exponentialPressure);
            totalInversion += exponentialPressure;
        }

        for (const [type, state] of this.needs.entries()) {
            const inv = inversions.get(type) || 0;
            state.weight = totalInversion > 0 ? inv / totalInversion : 0;
        }
    }

    public getNeedState(type: NeedType): NeedState | undefined {
        const state = this.needs.get(type);
        return state ? { ...state } : undefined;
    }

    public getAllNeeds(): Record<NeedType, NeedState> {
        return Object.fromEntries(this.needs) as Record<NeedType, NeedState>;
    }
}