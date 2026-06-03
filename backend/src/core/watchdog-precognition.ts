import { MatrixPrecognitionBrain, PrecognitionData } from '../../server/src/modules/brain/MatrixPrecognitionBrain.js';
import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogPrecognitionMonitor {
    private brain: MatrixPrecognitionBrain;

    constructor() {
        this.brain = new MatrixPrecognitionBrain();
    }

    public feedData(activeConnections: number, npcCount: number, tick = getBackendWatchdogTick()): void {
        this.brain.recordState(activeConnections, npcCount);
        this.evaluate(tick);
    }

    private evaluate(tick: number): void {
        const data: PrecognitionData = this.brain.analyzeMatrixFlux();

        if (data.projectedLoad > 0.8) {
             emitBackendWatchdogEvent(
                'MATRIX_OVERLOAD_PREDICTION',
                {
                    message: 'High matrix load projected.',
                    data,
                },
                'HIGH',
                'PRECOGNITION_WATCHDOG',
                tick,
            );
        }

        if (data.densitySpikeRisk > 0.7) {
            emitBackendWatchdogEvent(
                'DENSITY_SPIKE_WARNING',
                {
                    message: 'Density spike risk threshold crossed.',
                    data,
                },
                'MEDIUM',
                'PRECOGNITION_WATCHDOG',
                tick,
            );
        }
    }
}
