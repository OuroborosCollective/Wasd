export interface LegendContext {
    domain: string;
    scope: string[];
    parameters: Record<string, any>;
    timestamp: number;
}

export interface LegendResult {
    narrative: string;
    summary: string;
    keyPoints: string[];
    confidence: number;
    metadata: {
        provider: string;
        processingTimeMs: number;
        tokensUsed?: number;
    };
}

/**
 * Interface definition for Legend Providers.
 * Legend Providers are responsible for distilling raw data or logs into a human-readable narrative.
 */
export interface ILegendProvider {
    /**
     * Distills raw data into a coherent narrative.
     * @param rawData The input data points to be analyzed.
     * @param context Additional metadata and scoping for the generation.
     */
    distillLegend(rawData: any[], context: LegendContext): Promise<LegendResult>;
}

/**
 * Abstract Base Class for Legend Providers.
 * Provides a framework for data validation and result structuring.
 */
export abstract class BaseLegendProvider implements ILegendProvider {
    protected readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Main entry point for the distillation process.
     */
    public async distillLegend(rawData: any[], context: LegendContext): Promise<LegendResult> {
        const startTime = Date.now();

        if (!this.validateInput(rawData)) {
            throw new Error(`[${this.name}] Invalid input data: Data is null or empty.`);
        }

        try {
            const result = await this.executeDistillation(rawData, context);
            
            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    provider: this.name,
                    processingTimeMs: Date.now() - startTime
                }
            };
        } catch (error) {
            throw new Error(`[${this.name}] Distillation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * To be implemented by specific logic (LLM, Heuristics, Template-based).
     */
    protected abstract executeDistillation(rawData: any[], context: LegendContext): Promise<LegendResult>;

    /**
     * Basic validation of input data.
     */
    protected validateInput(rawData: any[]): boolean {
        return Array.isArray(rawData) && rawData.length > 0;
    }

    /**
     * Helper to normalize context for internal processing.
     */
    protected getContextString(context: LegendContext): string {
        return `Domain: ${context.domain}; Scope: ${context.scope.join(', ')}`;
    }
}