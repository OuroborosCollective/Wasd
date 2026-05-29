import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogLeylineMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorLeylineNetwork(nodeStateA: string, nodeStateB: string): void {
        if (nodeStateA === 'OVERLOAD' && nodeStateB === 'OVERLOAD') {
            this.emitter.emit(
                'LEYLINE_SURGE',
                { message: `Critical magic network overload detected between adjacent nodes.` },
                'CRITICAL',
                'LEYLINE_MONITOR'
            );
        }
    }
}
