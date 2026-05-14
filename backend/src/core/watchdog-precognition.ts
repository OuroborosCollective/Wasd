import { WatchdogEmitter } from './watchdog-emitter.js';
import { MatrixPrecognitionBrain, PrecognitionData } from '../../server/src/modules/brain/MatrixPrecognitionBrain.js';

export class WatchdogPrecognitionMonitor {
    private emitter: WatchdogEmitter;
    private brain: MatrixPrecognitionBrain;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
        this.brain = new MatrixPrecognitionBrain();
    }

    public feedData(activeConnections: number, npcCount: number) {
        this.brain.recordState(activeConnections, npcCount);
        this.evaluate();
    }

    private evaluate(): void {
        const data: PrecognitionData = this.brain.analyzeMatrixFlux();

        if (data.projectedLoad > 0.8) {
             this.emitter.emit(
                'MATRIX_OVERLOAD_PREDICTION',
                {
                    message: `High Matrix Load Projected. Scaling shards proactive alert.`,
                    data
                },
                'HIGH',
                'PRECOGNITION_WATCHDOG'
            );
        }

        if (data.densitySpikeRisk > 0.7) {
            this.emitter.emit(
                'DENSITY_SPIKE_WARNING',
                {
                    message: `Rapid density increase detected. Swarm threshold approaching.`,
                    data
                },
                'MEDIUM',
                'PRECOGNITION_WATCHDOG'
            );
        }
    }
}
