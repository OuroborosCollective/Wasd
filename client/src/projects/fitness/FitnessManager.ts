interface WearableData {
    heartRate: number;
    steps: number;
    timestamp: number;
}

interface FitnessStats {
    vitality: number;
    decayRate: number;
    isHealing: boolean;
}

export class FitnessManager {
    private worker: Worker | null = null;
    private currentVitality: number = 100;
    private baseDecayRate: number = 0.05;
    private currentDecayRate: number = 0.05;
    private healingMultiplier: number = 2.0;
    private thresholdHR: number = 100;
    private thresholdSteps: number = 50;
    private lastUpdate: number = Date.now();

    constructor() {
        this.initializeWorker();
    }

    private initializeWorker(): void {
        try {
            // Modern worker initialization using URL to resolve the TypeScript worker file correctly.
            // Note: The import of 'DecayWorker' was removed as it's handled via the URL constructor for Worker.
            this.worker = new Worker(new URL('./DecayWorker.ts', import.meta.url), {
                type: 'module'
            });
            
            this.worker.onmessage = (event: MessageEvent) => {
                this.handleWorkerUpdate(event.data);
            };
        } catch (error) {
            console.error("FitnessManager: Worker initialization failed", error);
        }
    }

    public processWearableData(data: WearableData): void {
        const isHighActivity = data.heartRate > this.thresholdHR || data.steps > this.thresholdSteps;
        
        if (isHighActivity) {
            // Reversal of decay: Healing occurs during high activity
            this.currentDecayRate = -this.baseDecayRate * this.healingMultiplier;
        } else {
            this.currentDecayRate = this.baseDecayRate;
        }

        this.updateWorkerConfig({
            decayRate: this.currentDecayRate,
            active: true
        });
        
        this.lastUpdate = data.timestamp;
    }

    private updateWorkerConfig(config: { decayRate: number, active: boolean }): void {
        if (this.worker) {
            this.worker.postMessage({
                type: 'UPDATE_CONFIG',
                payload: config
            });
        }
    }

    private handleWorkerUpdate(data: { vitality: number }): void {
        this.currentVitality = data.vitality;
        this.dispatchUpdateEvent();
    }

    private dispatchUpdateEvent(): void {
        const event = new CustomEvent('fitnessUpdate', {
            detail: {
                vitality: this.currentVitality,
                isHealing: this.currentVitality > 0 && this.currentDecayRate < 0
            }
        });
        window.dispatchEvent(event);
    }

    public start(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'START' });
        }
    }

    public stop(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'STOP' });
        }
    }

    public getVitality(): number {
        return this.currentVitality;
    }

    public mockActivityEvent(): void {
        this.processWearableData({
            heartRate: 120,
            steps: 60,
            timestamp: Date.now()
        });

        setTimeout(() => {
            this.processWearableData({
                heartRate: 70,
                steps: 0,
                timestamp: Date.now()
            });
        }, 5000);
    }

    public dispose(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}