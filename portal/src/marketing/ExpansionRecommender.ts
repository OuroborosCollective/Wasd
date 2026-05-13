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
    // Indexed maps for O(1) lookups
    private productsById: Map<string, TechVector> = new Map();
    private productsByCategory: Map<string, TechVector[]> = new Map();
    
    // Plexity weights: 45% Engagement, 35% Intent, 20% Technical Fit
    private static readonly WEIGHT_ENGAGEMENT = 0.45;
    private static readonly WEIGHT_INTENT = 0.35;
    private static readonly WEIGHT_TECHNICAL_FIT = 0.20;

    /**
     * Register product for O(1) lookup.
     */
    public registerProduct(id: string, category: string, techVector: TechVector): void {
        this.productsById.set(id, techVector);
        const catProducts = this.productsByCategory.get(category) || [];
        catProducts.push(techVector);
        this.productsByCategory.set(category, catProducts);
    }

    /**
     * Get product by ID - O(1).
     */
    public getProductById(id: string): TechVector | undefined {
        return this.productsById.get(id);
    }

    /**
     * Get products by category - O(1).
     */
    public getProductsByCategory(category: string): TechVector[] {
        return this.productsByCategory.get(category) || [];
    }

    public calculateConversionProbability(
        metrics: UsageMetrics,
        currentStack: TechVector,
        targetRequirements: TechVector
    ): number {
        const featureAdoption = this.calculateFeatureAdoption(metrics.currentUsage, metrics.threshold);
        const interactionFrequency = this.calculateInteractionFrequency(metrics.sessionCount, metrics.daysActive);
        const affinity = this.calculatePlexityAffinity(currentStack, targetRequirements);

        const score = (featureAdoption * ExpansionRecommender.WEIGHT_ENGAGEMENT) +
                      (interactionFrequency * ExpansionRecommender.WEIGHT_INTENT) +
                      (affinity * ExpansionRecommender.WEIGHT_TECHNICAL_FIT);

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