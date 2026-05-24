import { WatchdogEmitter } from './watchdog-emitter.js';
import { ChronoSwarmBrain } from '../../server/src/modules/brain/ChronoSwarmBrain.js';

export class WatchdogSwarmMonitor {
    private emitter: WatchdogEmitter;
    private brain: ChronoSwarmBrain;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
        this.brain = new ChronoSwarmBrain();
    }

    public evaluateEntities(entities: { id: string; x: number; y: number; z: number }[]) {
        const swarms = this.brain.analyzeSpatialDistribution(entities);

        for (const swarm of swarms) {
            if (swarm.physicsThreatLevel > 0.8) {
                this.emitter.emit(
                    'CHRONO_SWARM_CRITICAL',
                    {
                        message: `Critical entity swarm detected at ${swarm.center.x}, ${swarm.center.y}, ${swarm.center.z}. Physics desync imminent.`,
                        swarm
                    },
                    'CRITICAL',
                    'SWARM_WATCHDOG'
                );
            } else if (swarm.physicsThreatLevel > 0.5) {
                this.emitter.emit(
                    'CHRONO_SWARM_WARNING',
                    {
                        message: `High density swarm forming. Engaging crowd control heuristics.`,
                        swarm
                    },
                    'MEDIUM',
                    'SWARM_WATCHDOG'
                );
            }
        }
    }
}