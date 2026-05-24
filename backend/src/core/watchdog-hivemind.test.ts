import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchdogHivemindMonitor } from './watchdog-hivemind.js';
import { WatchdogEmitter } from './watchdog-emitter.js';

// Mock WatchdogEmitter
vi.mock('./watchdog-emitter.js', () => {
    const WatchdogEmitter = vi.fn();
    WatchdogEmitter.prototype.emit = vi.fn();
    return { WatchdogEmitter };
});

describe('WatchdogHivemindMonitor', () => {
    let monitor: WatchdogHivemindMonitor;
    let mockEmitter: any;

    beforeEach(() => {
        vi.clearAllMocks();
        monitor = new WatchdogHivemindMonitor('ws://test:9090');
        // @ts-ignore - accessing private property for testing
        mockEmitter = monitor['emitter'];
    });

    it('should emit SWARM_OVERLOAD when entityCount is greater than 100', () => {
        monitor.monitorSwarmSize(101);

        expect(mockEmitter.emit).toHaveBeenCalledWith(
            'SWARM_OVERLOAD',
            expect.objectContaining({
                message: expect.stringContaining('Critical swarm mass detected: 101 entities')
            }),
            'CRITICAL',
            'HIVEMIND_MONITOR'
        );
    });

    it('should NOT emit anything when entityCount is 100 or less', () => {
        monitor.monitorSwarmSize(100);
        monitor.monitorSwarmSize(50);
        monitor.monitorSwarmSize(0);

        expect(mockEmitter.emit).not.toHaveBeenCalled();
    });
});
