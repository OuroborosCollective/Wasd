export interface NeuralVector {
    dimensions: number[];
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface ResonanceResult {
    aggression_avg: number;
    is_hostile: boolean;
    confidence: number;
    detected_patterns: string[];
}

export class TraitResonanceEngine {
    private readonly windowSize: number;
    private readonly hostilityThreshold: number;
    private vectorBuffer: NeuralVector[];
    private aggressionScores: number[];

    constructor(windowSize: number = 50, hostilityThreshold: number = 0.75) {
        this.windowSize = windowSize;
        this.hostilityThreshold = hostilityThreshold;
        this.vectorBuffer = [];
        this.aggressionScores = [];
    }

    public processVector(vector: NeuralVector): ResonanceResult {
        this.addToBuffer(vector);
        const aggressionScore = this.analyzeAggression(vector);
        this.aggressionScores.push(aggressionScore);

        if (this.aggressionScores.length > this.windowSize) {
            this.aggressionScores.shift();
        }

        const aggressionAvg = this.calculateAggressionAvg();
        const patterns = this.detectHostilePatterns(vector, aggressionScore);

        return {
            aggression_avg: aggressionAvg,
            is_hostile: aggressionAvg > this.hostilityThreshold,
            confidence: this.calculateConfidence(vector),
            detected_patterns: patterns
        };
    }

    private addToBuffer(vector: NeuralVector): void {
        this.vectorBuffer.push(vector);
        if (this.vectorBuffer.length > this.windowSize) {
            this.vectorBuffer.shift();
        }
    }

    private analyzeAggression(vector: NeuralVector): number {
        if (!vector.dimensions || vector.dimensions.length === 0) return 0;
        
        const sum = vector.dimensions.reduce((acc, val) => acc + Math.abs(val), 0);
        const mean = sum / vector.dimensions.length;
        
        const variance = vector.dimensions.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / vector.dimensions.length;
        
        const normalizedAggression = Math.min(1, (mean + Math.sqrt(variance)) / 2);
        return normalizedAggression;
    }

    private calculateAggressionAvg(): number {
        if (this.aggressionScores.length === 0) return 0;
        const sum = this.aggressionScores.reduce((a, b) => a + b, 0);
        return sum / this.aggressionScores.length;
    }

    private detectHostilePatterns(vector: NeuralVector, currentScore: number): string[] {
        const patterns: string[] = [];

        if (currentScore > this.hostilityThreshold) {
            patterns.push("HIGH_INTENSITY_SPIKE");
        }

        if (this.aggressionScores.length >= 3) {
            const lastThree = this.aggressionScores.slice(-3);
            if (lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0]) {
                patterns.push("ESCALATION_TREND");
            }
        }

        const variance = this.calculateVectorVariance(vector.dimensions);
        if (variance > 0.8) {
            patterns.push("ERRATIC_NEURAL_OSCILLATION");
        }

        return patterns;
    }

    private calculateVectorVariance(dimensions: number[]): number {
        const mean = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
        return dimensions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dimensions.length;
    }

    private calculateConfidence(vector: NeuralVector): number {
        const dimensionIntegrity = vector.dimensions.every(d => !isNaN(d)) ? 1.0 : 0.0;
        const windowStability = this.vectorBuffer.length / this.windowSize;
        return (dimensionIntegrity * 0.7) + (windowStability * 0.3);
    }

    public getBufferState(): { size: number; current_avg: number } {
        return {
            size: this.vectorBuffer.length,
            current_avg: this.calculateAggressionAvg()
        };
    }

    public clear(): void {
        this.vectorBuffer = [];
        this.aggressionScores = [];
    }
}