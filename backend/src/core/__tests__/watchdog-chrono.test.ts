import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchdogChronoMonitor } from '../watchdog-chrono.js';
import { WatchdogEmitter } from '../watchdog-emitter.js';

const mockEmit = vi.fn();

vi.mock('../watchdog-emitter.js', () => {
    return {
        WatchdogEmitter: vi.fn().mockImplementation(function() {
            return {
                emit: mockEmit
            };
        })
    };
});

describe('WatchdogChronoMonitor', () => {
    let monitor: WatchdogChronoMonitor;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEmit.mockClear();
    });

    it('should NOT emit an anomaly when dilationFactor is >= 0.2', () => {
        monitor = new WatchdogChronoMonitor('ws://test-url');

        monitor.monitorDilation(0.2);
        monitor.monitorDilation(0.5);

        expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should emit a TEMPORAL_ANOMALY when dilationFactor is < 0.2', () => {
        monitor = new WatchdogChronoMonitor('ws://test-url');

        const factor = 0.1;
        monitor.monitorDilation(factor);

        expect(mockEmit).toHaveBeenCalledWith(
            'TEMPORAL_ANOMALY',
            { message: `Extreme time dilation detected (factor: ${factor}). Physics desync risk.` },
            'HIGH',
            'CHRONO_MONITOR'
        );
    });

    it('should use default emitter URL if none provided', () => {
        new WatchdogChronoMonitor();
        expect(WatchdogEmitter).toHaveBeenCalledWith('ws://localhost:9090');
    });
});
