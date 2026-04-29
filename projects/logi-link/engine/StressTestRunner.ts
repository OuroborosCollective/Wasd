export interface ScarcityContext {
    supply: number;
    demand: number;
}

export class ScarcityLogic {
    public calculateHostilityScore(context: ScarcityContext): number {
        if (context.demand <= 0) return 0;
        if (context.supply >= context.demand) return 0;
        
        const deficit = context.demand - context.supply;
        const scarcityRatio = deficit / context.demand;
        
        // Hostility grows exponentially as supply vanishes
        return Math.min(1.0, Math.pow(scarcityRatio, 1.2) * 1.5);
    }
}

export interface SimulationResult {
    iteration: number;
    supplyLevel: number;
    hostilityScore: number;
    isCritical: boolean;
}

export interface StressTestSummary {
    totalIterations: number;
    tippingPointsIdentified: number;
    criticalThreshold: number;
    averageHostility: number;
    maxHostility: number;
    failureProbability: number;
    criticalScenarios: SimulationResult[];
}

export class StressTestRunner {
    private scarcityLogic: ScarcityLogic;

    constructor() {
        this.scarcityLogic = new ScarcityLogic();
    }

    /**
     * Executes a Monte Carlo simulation to identify tipping points where supply disruptions
     * lead to critical hostility levels.
     * 
     * @param iterations Number of simulation runs (e.g., 1000)
     * @param baseSupply The nominal supply level before disruptions
     * @param demand The constant demand level to test against
     * @param volatility Factor determining the scale of random supply drops
     * @param threshold The hostility score at which a scenario is considered critical
     */
    public runMonteCarlo(
        iterations: number = 1000,
        baseSupply: number,
        demand: number,
        volatility: number,
        threshold: number = 0.75
    ): StressTestSummary {
        const criticalScenarios: SimulationResult[] = [];
        let totalHostility = 0;
        let maxHostility = 0;

        for (let i = 0; i < iterations; i++) {
            const simulatedSupply = this.applyRandomDisruption(baseSupply, volatility);
            
            const hostility = this.scarcityLogic.calculateHostilityScore({
                supply: simulatedSupply,
                demand: demand
            });

            totalHostility += hostility;
            if (hostility > maxHostility) maxHostility = hostility;

            const isCritical = hostility >= threshold;

            if (isCritical) {
                criticalScenarios.push({
                    iteration: i,
                    supplyLevel: simulatedSupply,
                    hostilityScore: hostility,
                    isCritical: true
                });
            }
        }

        return {
            totalIterations: iterations,
            tippingPointsIdentified: criticalScenarios.length,
            criticalThreshold: threshold,
            averageHostility: totalHostility / iterations,
            maxHostility: maxHostility,
            failureProbability: criticalScenarios.length / iterations,
            criticalScenarios: criticalScenarios
        };
    }

    /**
     * Generates a randomized supply level based on potential disruptions.
     * Uses a combination of Gaussian noise and occasional "black swan" events.
     */
    private applyRandomDisruption(baseSupply: number, volatility: number): number {
        // Standard normal distribution via Box-Muller
        const u1 = Math.random();
        const u2 = Math.random();
        const standardNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        
        // Base fluctuation
        let disruption = standardNormal * volatility;
        
        // Black Swan event (5% probability of major supply chain collapse)
        if (Math.random() < 0.05) {
            disruption -= baseSupply * 0.4 * Math.random();
        }

        return Math.max(0, baseSupply + disruption);
    }
}