import { WatchdogEmitter } from './watchdog-emitter.js';
import { RealityFissureBrain, FissureData } from '../../server/src/modules/brain/RealityFissureBrain.js';

export class WatchdogFissureMonitor {
    private emitter: WatchdogEmitter;
    private brain: RealityFissureBrain;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
        this.brain = new RealityFissureBrain();
    }

    public reportParadoxToBrain(chunkId: string, paradoxType: string) {
        this.brain.reportParadox(chunkId, paradoxType);
        this.evaluateFissures();
    }

    private evaluateFissures(): void {
        const criticalFissures = this.brain.getCriticalFissures();

        for (const fissure of criticalFissures) {
            this.emitter.emit(
                'REALITY_FISSURE_ISOLATION',
                {
                    message: `Critical Reality Fissure detected in chunk ${fissure.chunkId}. Isolating and freezing physics.`,
                    fissure
                },
                'CRITICAL',
                'FISSURE_WATCHDOG'
            );
        }
    }
}