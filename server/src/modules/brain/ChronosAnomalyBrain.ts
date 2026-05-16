/**
 * ChronosAnomalyBrain: Time Dilation System
 * Predicts and spawns anomaly zones based on stagnation heuristics.
 */

export interface AnomalyZone {
    x: number;
    y: number;
    radiusSq: number;
    dilationMultiplier: number; // >1 = fast, <1 = slow
    expiresAt: number;
}

export class ChronosAnomalyBrain {
    private anomalies: AnomalyZone[] = [];
    private lastEvaluation: number = 0;
    private readonly EVALUATION_INTERVAL = 120000; // 2 minutes

    public evaluateStagnation(currentTime: number, sectorActivity: Map<string, number>) {
        if (currentTime - this.lastEvaluation < this.EVALUATION_INTERVAL) {
            return;
        }

        // Clean up expired anomalies
        this.anomalies = this.anomalies.filter(a => a.expiresAt > currentTime);

        // Deterministically spawn new anomalies based on hypothetical sector stagnation
        // (Mock logic mapping sector strings to predictable coordinates)
        sectorActivity.forEach((activityLevel, sectorId) => {
            if (activityLevel < 0.2) { // Stagnation threshold
                // Deterministic pseudo-random generation based on sectorId length/chars
                const hashX = sectorId.charCodeAt(0) * 10 % 100;
                const hashY = sectorId.charCodeAt(sectorId.length - 1) * 10 % 100;

                this.anomalies.push({
                    x: hashX,
                    y: hashY,
                    radiusSq: 100, // radius 10
                    dilationMultiplier: 0.5, // Slow time by 50%
                    expiresAt: currentTime + 300000 // Lasts 5 mins
                });
            }
        });

        this.lastEvaluation = currentTime;
    }

    public getActiveAnomalies(): AnomalyZone[] {
        return this.anomalies;
    }
}
