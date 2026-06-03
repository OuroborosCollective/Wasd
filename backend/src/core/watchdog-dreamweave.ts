import { WatchdogEmitter } from './watchdog-emitter.js';

export class WatchdogDreamWeaveMonitor {
    private emitter: WatchdogEmitter;

    constructor(emitterUrl: string = 'ws://localhost:9090') {
        this.emitter = new WatchdogEmitter(emitterUrl);
    }

    monitorCollectiveSanity(collectiveSanity: number, lucidDreamersPresent: boolean): void {
        if (collectiveSanity < 20 && lucidDreamersPresent) {
            this.emitter.emit(
                'DREAM_WEAVE_BREACH',
                { message: `Sanity critically low with lucid dreamers present. Dream Weave breach imminent.` },
                'HIGH',
                'DREAM_WEAVE_MONITOR'
            );
        }
    }
}
