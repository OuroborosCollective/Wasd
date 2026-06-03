import { RealityFissureBrain } from '../../server/src/modules/brain/RealityFissureBrain.js';
import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogFissureMonitor {
    private brain: RealityFissureBrain;

    constructor() {
        this.brain = new RealityFissureBrain();
    }

    public reportParadoxToBrain(chunkId: string, paradoxType: string, tick = getBackendWatchdogTick()): void {
        this.brain.reportParadox(chunkId, paradoxType);
        this.evaluateFissures(tick);
    }

    private evaluateFissures(tick: number): void {
        const criticalFissures = this.brain.getCriticalFissures();

        for (const fissure of criticalFissures) {
            emitBackendWatchdogEvent(
                'REALITY_FISSURE_ISOLATION',
                {
                    message: 'Critical reality fissure detected.',
                    fissure,
                },
                'CRITICAL',
                'FISSURE_WATCHDOG',
                tick,
            );
        }
    }
}
