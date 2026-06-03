import { ChronoSwarmBrain } from '../../server/src/modules/brain/ChronoSwarmBrain.js';
import { emitBackendWatchdogEvent, getBackendWatchdogTick } from './watchdog-runtime';

export class WatchdogSwarmMonitor {
    private brain: ChronoSwarmBrain;

    constructor() {
        this.brain = new ChronoSwarmBrain();
    }

    public evaluateEntities(entities: { id: string; x: number; y: number; z: number }[], tick = getBackendWatchdogTick()): void {
        const swarms = this.brain.analyzeSpatialDistribution(entities);

        for (const swarm of swarms) {
            if (swarm.physicsThreatLevel > 0.8) {
                emitBackendWatchdogEvent(
                    'CHRONO_SWARM_CRITICAL',
                    {
                        message: 'Critical entity swarm detected.',
                        swarm,
                    },
                    'CRITICAL',
                    'SWARM_WATCHDOG',
                    tick,
                );
            } else if (swarm.physicsThreatLevel > 0.5) {
                emitBackendWatchdogEvent(
                    'CHRONO_SWARM_WARNING',
                    {
                        message: 'High density swarm forming.',
                        swarm,
                    },
                    'MEDIUM',
                    'SWARM_WATCHDOG',
                    tick,
                );
            }
        }
    }
}
