import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogHivemindMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorSwarmSize(entityCount: number): void {
        if (entityCount > 100) {
            this.emitter.emit(
                'SWARM_OVERLOAD',
                { message: `Critical swarm mass detected: ${entityCount} entities. Initiating safety split protocol.` },
                'CRITICAL',
                'HIVEMIND_MONITOR'
            );
        }
    }
}
