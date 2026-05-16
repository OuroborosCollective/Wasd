/**
 * VoidSwarmBrain: Emergent PvE Macro-event
 * Heuristically routes the swarm towards high-density Kappa grid areas using low-frequency calculations.
 */

export interface SwarmTarget {
    x: number;
    y: number;
    densityScore: number;
    intensity: number; // 1.0 to 10.0
}

export class VoidSwarmBrain {
    private target: SwarmTarget | null = null;
    private swarmActive: boolean = false;
    private lastEvaluation: number = 0;
    private readonly EVALUATION_INTERVAL = 300000; // 5 minutes

    public evaluateSwarmSpawns(currentTime: number, structureDensityMap: Map<string, number>) {
        if (currentTime - this.lastEvaluation < this.EVALUATION_INTERVAL) {
            return;
        }

        let maxDensity = 0;
        let bestTargetId = "";

        // Find the highest density area heuristically
        structureDensityMap.forEach((density, gridId) => {
            if (density > maxDensity) {
                maxDensity = density;
                bestTargetId = gridId;
            }
        });

        if (maxDensity > 0.8) { // Threshold for swarm incursion
            // Deterministic extraction of coordinates from gridId assuming format "X_Y"
            const parts = bestTargetId.split('_');
            const targetX = parseInt(parts[0]) || 0;
            const targetY = parseInt(parts[1]) || 0;

            this.target = {
                x: targetX,
                y: targetY,
                densityScore: maxDensity,
                intensity: Math.min(10.0, maxDensity * 5)
            };
            this.swarmActive = true;
        } else {
            // Calm down if no high-density areas
            this.swarmActive = false;
        }

        this.lastEvaluation = currentTime;
    }

    public getActiveSwarmTarget(): SwarmTarget | null {
        return this.swarmActive ? this.target : null;
    }
}
