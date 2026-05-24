import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchdogChronoSynapticMonitor } from '../watchdog-chrono-synaptic.js';
import { WatchdogEmitter } from '../watchdog-emitter.js';

// Mock the WatchdogEmitter to avoid WebSocket connections
vi.mock('../watchdog-emitter.js', () => {
    const WatchdogEmitter = vi.fn();
    WatchdogEmitter.prototype.emit = vi.fn();
    return { WatchdogEmitter };
});

describe('WatchdogChronoSynapticMonitor', () => {
    let monitor: WatchdogChronoSynapticMonitor;
    let mockEmitterInstance: any;

    beforeEach(() => {
        vi.clearAllMocks();
        monitor = new WatchdogChronoSynapticMonitor('ws://test-url');
        // The instance created in the constructor
        mockEmitterInstance = (WatchdogEmitter as any).mock.instances[0];
    });

    it('should not emit an alert if tick time is below threshold (50ms)', () => {
        monitor.monitorTickTime(30);
        expect(mockEmitterInstance.emit).not.toHaveBeenCalled();
    });

    it('should not emit an alert if tick time is exactly at threshold (50ms)', () => {
        monitor.monitorTickTime(50);
        expect(mockEmitterInstance.emit).not.toHaveBeenCalled();
    });

    it('should emit SYNAPTIC_OVERLOAD alert if tick time exceeds threshold', () => {
        const tickTime = 100;
        monitor.monitorTickTime(tickTime);

        expect(mockEmitterInstance.emit).toHaveBeenCalledWith(
            'SYNAPTIC_OVERLOAD',
            {
                message: `Critical tick delay detected: ${tickTime}ms. Initiating Chrono-Synaptic time dilation.`,
                overloadFactor: 2 // 100 / 50
            },
            'WARNING',
            'CHRONO_SYNAPTIC_MONITOR'
        );
    });

    it('should calculate the correct overload factor for different tick times', () => {
        const tickTime = 75;
        monitor.monitorTickTime(tickTime);

        expect(mockEmitterInstance.emit).toHaveBeenCalledWith(
            'SYNAPTIC_OVERLOAD',
            expect.objectContaining({
                overloadFactor: 1.5 // 75 / 50
            }),
            expect.any(String),
            expect.any(String)
        );
    });
});
