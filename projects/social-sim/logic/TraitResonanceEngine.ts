export class TraitResonanceEngine {
    /**
     * Calculates the resonance value between two traits.
     * Faith acts as a positive enhancer, while aggression acts as a damper.
     * 
     * @param aggression Value representing the aggression trait (0.0 to 1.0)
     * @param faith Value representing the faith trait (0.0 to 1.0)
     * @returns A resonance value between 0.0 and 1.0
     */
    public calculateResonance(aggression: number, faith: number): number {
        const clampedAggression = Math.max(0, Math.min(1, aggression));
        const clampedFaith = Math.max(0, Math.min(1, faith));
        
        // Faith provides the base potential for resonance.
        // Aggression acts as a multiplier that reduces this potential.
        // A value of 1.0 aggression results in 0 resonance, regardless of faith.
        const resonance = clampedFaith * (1 - clampedAggression);
        
        return resonance;
    }
}