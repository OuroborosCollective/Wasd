import { ScarcityPredictor } from "../prediction/ScarcityPredictor";

export interface Goal {
    type: 'Relocate' | 'Stockpile' | 'Trade' | 'Work' | 'Idle';
    weight: number;
    baseWeight: number;
    targetRegionId?: string;
}

export interface RegionState {
    id: string;
    resourceStability: number;
    availableResources: Record<string, number>;
}

export interface NPC {
    id: string;
    inventory: Record<string, number>;
    travelCostMultiplier: number;
    riskTolerance: number;
}

export class GoalEvaluator {
    private readonly CRITICAL_RESOURCES = ['food', 'fuel', 'medicine'];
    private readonly PREDICTION_THRESHOLD = 0.65;

    constructor(private scarcityPredictor: ScarcityPredictor) {}

    public evaluateGoals(
        npc: NPC, 
        goals: Goal[], 
        currentRegion: RegionState, 
        neighboringRegions: RegionState[]
    ): Goal[] {
        const predictions = this.scarcityPredictor.getPredictions(currentRegion.id);
        const activeThreats = predictions.filter(p => 
            this.CRITICAL_RESOURCES.includes(p.resource) && 
            p.probability >= this.PREDICTION_THRESHOLD
        );

        const scarcityImminent = activeThreats.length > 0;

        return goals.map(goal => {
            let evaluatedWeight = goal.baseWeight;

            if (scarcityImminent) {
                const maxSeverity = Math.max(...activeThreats.map(t => t.severity));

                if (goal.type === 'Stockpile') {
                    // Erhöhe Priorität für Vorratshaltung basierend auf Schweregrad der Vorhersage
                    evaluatedWeight += (maxSeverity * 75);
                }

                if (goal.type === 'Relocate') {
                    const migrationScore = this.calculateMigrationProfitability(
                        npc, 
                        currentRegion, 
                        neighboringRegions, 
                        maxSeverity
                    );
                    
                    // Nur erhöhen, wenn Migration profitabler ist als Bleiben
                    if (migrationScore > 0) {
                        evaluatedWeight += migrationScore;
                    }
                }
            }

            return {
                ...goal,
                weight: evaluatedWeight
            };
        }).sort((a, b) => b.weight - a.weight);
    }

    private calculateMigrationProfitability(
        npc: NPC, 
        current: RegionState, 
        neighbors: RegionState[], 
        scarcitySeverity: number
    ): number {
        if (neighbors.length === 0) return -1;

        const bestNeighbor = neighbors.reduce((prev, curr) => 
            curr.resourceStability > prev.resourceStability ? curr : prev
        );

        const stabilityDelta = bestNeighbor.resourceStability - current.resourceStability;
        const travelPenalty = npc.travelCostMultiplier * 15;
        
        // Heuristik: (Stabilitätsdifferenz * Gewichtung der Knappheit) - Kosten
        // Berücksichtigt Risiko-Toleranz des NPCs
        const heuristic = (stabilityDelta * 100 * scarcitySeverity * npc.riskTolerance) - travelPenalty;

        return heuristic;
    }
}