export interface IPlayerEvent {
    type: 'MISSION_SUCCESS' | 'MISSION_FAILURE' | 'RESOURCE_DONATION' | 'HOSTILE_ACTION' | 'TERRITORY_CLAIM';
    targetFactionId: string;
    magnitude: number;
    alignmentImpact: number;
    timestamp: number;
}

export interface IFactionRelation {
    targetId: string;
    value: number; // -100 to 100
}

export type FactionState = 'DORMANT' | 'STABLE' | 'EXPANDING' | 'WAR' | 'COLLAPSING';

export interface IFaction {
    id: string;
    influence: number;
    resources: number;
    relations: IFactionRelation[];
    state: FactionState;
    territoryCount: number;
}

export interface IFactionUpdate {
    influence: number;
    resources: number;
    relations: IFactionRelation[];
    state: FactionState;
    lastUpdate: number;
}

export interface IFactionEvolution {
    processEvolution(faction: IFaction, events: IPlayerEvent[]): IFactionUpdate;
}

export class FactionEvolutionEngine implements IFactionEvolution {
    private readonly INFLUENCE_DECAY_RATE = 0.02;
    private readonly RESOURCE_CONSUMPTION_BASE = 10;
    private readonly EXPANSION_THRESHOLD = 800;
    private readonly COLLAPSE_THRESHOLD = 100;

    public processEvolution(faction: IFaction, events: IPlayerEvent[]): IFactionUpdate {
        let currentInfluence = faction.influence;
        let currentResources = faction.resources;
        let currentRelations = [...faction.relations.map(r => ({ ...r }))];
        let currentState = faction.state;

        // Apply Player Events
        for (const event of events) {
            if (event.targetFactionId === faction.id) {
                const impact = this.calculateImpact(event);
                currentInfluence += impact.influence;
                currentResources += impact.resources;
                
                this.updateGlobalRelations(currentRelations, event.alignmentImpact);
            }
        }

        // Autonomous Decay and Growth
        currentInfluence -= currentInfluence * this.INFLUENCE_DECAY_RATE;
        currentResources -= (this.RESOURCE_CONSUMPTION_BASE * faction.territoryCount);

        // State Transition Logic
        currentState = this.evaluateState(currentInfluence, currentResources, currentState);

        // State-based modifiers
        if (currentState === 'EXPANDING') {
            currentResources -= 50;
            currentInfluence += 20;
        } else if (currentState === 'WAR') {
            currentResources -= 100;
            currentInfluence -= 10;
        } else if (currentState === 'COLLAPSING') {
            currentInfluence -= 30;
        }

        return {
            influence: Math.max(0, currentInfluence),
            resources: Math.max(0, currentResources),
            relations: currentRelations,
            state: currentState,
            lastUpdate: Date.now()
        };
    }

    private calculateImpact(event: IPlayerEvent): { influence: number; resources: number } {
        switch (event.type) {
            case 'MISSION_SUCCESS':
                return { influence: event.magnitude * 15, resources: event.magnitude * 10 };
            case 'MISSION_FAILURE':
                return { influence: event.magnitude * -10, resources: event.magnitude * -5 };
            case 'RESOURCE_DONATION':
                return { influence: event.magnitude * 5, resources: event.magnitude * 20 };
            case 'HOSTILE_ACTION':
                return { influence: event.magnitude * -20, resources: event.magnitude * -15 };
            case 'TERRITORY_CLAIM':
                return { influence: event.magnitude * 50, resources: event.magnitude * -30 };
            default:
                return { influence: 0, resources: 0 };
        }
    }

    private updateGlobalRelations(relations: IFactionRelation[], alignmentImpact: number): void {
        relations.forEach(rel => {
            rel.value = Math.max(-100, Math.min(100, rel.value + alignmentImpact));
        });
    }

    private evaluateState(influence: number, resources: number, currentState: FactionState): FactionState {
        if (influence <= this.COLLAPSE_THRESHOLD || resources <= 0) {
            return 'COLLAPSING';
        }

        if (influence >= this.EXPANSION_THRESHOLD && resources >= 500) {
            return 'EXPANDING';
        }

        if (currentState === 'WAR' && influence > 300) {
            return 'WAR'; // Stay in war if still influential
        }

        if (influence > 200 && resources > 200) {
            return 'STABLE';
        }

        return 'DORMANT';
    }
}