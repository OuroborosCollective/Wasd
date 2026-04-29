export interface UsageMetrics {
    currentUsage: number;
    threshold: number;
    sessionCount: number;
    daysActive: number;
}

export interface TechVector {
    [feature: string]: number;
}

export class ExpansionRecommender {
    private static readonly WEIGHT_FEATURE_ADOPTION = 0.4;
    private static readonly WEIGHT_INTERACTION_FREQUENCY = 0.3;
    private static readonly WEIGHT_PLEXITY_AFFINITY = 0.3;

    public calculateConversionProbability(
        metrics: UsageMetrics,
        currentStack: TechVector,
        targetRequirements: TechVector
    ): number {
        const featureAdoption = this.calculateFeatureAdoption(metrics.currentUsage, metrics.threshold);
        const interactionFrequency = this.calculateInteractionFrequency(metrics.sessionCount, metrics.daysActive);
        const affinity = this.calculatePlexityAffinity(currentStack, targetRequirements);

        const score = (featureAdoption * ExpansionRecommender.WEIGHT_FEATURE_ADOPTION) +
                      (interactionFrequency * ExpansionRecommender.WEIGHT_INTERACTION_FREQUENCY) +
                      (affinity * ExpansionRecommender.WEIGHT_PLEXITY_AFFINITY);

        return this.normalize(score);
    }

    private calculateFeatureAdoption(usage: number, threshold: number): number {
        if (threshold <= 0) return 0;
        return usage / threshold;
    }

    private calculateInteractionFrequency(sessions: number, days: number): number {
        if (days <= 0) return 0;
        return sessions / days;
    }

    private calculatePlexityAffinity(current: TechVector, target: TechVector): number {
        const keys = new Set([...Object.keys(current), ...Object.keys(target)]);
        let sumSquaredDifferences = 0;

        keys.forEach(key => {
            const val1 = current[key] || 0;
            const val2 = target[key] || 0;
            sumSquaredDifferences += Math.pow(val1 - val2, 2);
        });

        const distance = Math.sqrt(sumSquaredDifferences);
        return 1 / (1 + distance);
    }

    private normalize(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}