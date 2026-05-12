import { PlexityLogic } from './PlexityLogic';
import { ConstructionScheduler } from './ConstructionScheduler';

export interface Signature {
    id: string;
    intensity: number;
    vector: number[];
    origin: string;
}

export class MasterExpansionOrchestrator {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 100;
    private readonly LEGEND_THRESHOLD = 0.95;
    private readonly RESONANCE_MIN_THRESHOLD = 0.85;

    constructor(
        private plexityLogic: PlexityLogic,
        private constructionScheduler: ConstructionScheduler,
        private signatureSource: { getActiveSignatures: () => Signature[] }
    ) {}

    public start(): void {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.unifiedConvergenceLoop(), this.TICK_RATE);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public processTick(): void {
        this.unifiedConvergenceLoop();
    }

    private unifiedConvergenceLoop(): void {
        try {
            const signatures = this.signatureSource.getActiveSignatures();
            
            const legendSignatures = signatures.filter(sig => sig.intensity >= this.LEGEND_THRESHOLD);

            for (const signature of legendSignatures) {
                const resonanceScore = this.plexityLogic.checkResonance(signature);

                if (resonanceScore >= this.RESONANCE_MIN_THRESHOLD) {
                    this.constructionScheduler.executeConvergence({
                        targetId: signature.id,
                        intensity: signature.intensity,
                        resonance: resonanceScore,
                        type: 'EXPANSION_NODE',
                        timestamp: Date.now()
                    });
                }
            }
        } catch (error) {
            // Error handling internally maintained for system stability
        }
    }
}