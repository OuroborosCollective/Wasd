import { DecayWorker } from './DecayWorker';

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
    private healingMultiplier: number = 2.0;
    private thresholdHR: number = 100;
    private thresholdSteps: number = 50;
    private lastUpdate: number = Date.now();

    constructor(workerPath: string = 'decay-worker.js') {
        this.initializeWorker(workerPath);
    }

    private initializeWorker(path: string): void {
        try {
            this.worker = new Worker(path);
            this.worker.onmessage = (event: MessageEvent) => {
                this.handleWorkerUpdate(event.data);
            };
        } catch (error) {
            console.error("FitnessManager: Worker initialization failed", error);
        }
    }

    public processWearableData(data: WearableData): void {
        const isHighActivity = data.heartRate > this.thresholdHR || data.steps > this.thresholdSteps;
        
        let targetDecayRate: number;
        
        if (isHighActivity) {
            // Umkehrung des Decay-Faktors: Heilung statt Verfall
            targetDecayRate = -this.baseDecayRate * this.healingMultiplier;
        } else {
            targetDecayRate = this.baseDecayRate;
        }

        this.updateWorkerConfig({
            decayRate: targetDecayRate,
            active: true
        });
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
                isHealing: this.currentVitality > 0 && this.baseDecayRate < 0
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
        // Simuliert einen kurzzeitigen Aktivitätsschub für Tests
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