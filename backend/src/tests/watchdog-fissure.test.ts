import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchdogFissureMonitor } from '../core/watchdog-fissure.js';

// Mock WatchdogEmitter to avoid WebSocket connections
vi.mock('../core/watchdog-emitter.js', () => {
    class WatchdogEmitter {
        emit = vi.fn();
        connect = vi.fn();
        subscribe = vi.fn();
        triggerInstabilityAlert = vi.fn();
        broadcast = vi.fn();
    }
    return { WatchdogEmitter };
});

describe('WatchdogFissureMonitor', () => {
    let monitor: WatchdogFissureMonitor;

    beforeEach(() => {
        vi.clearAllMocks();
        monitor = new WatchdogFissureMonitor('ws://test-url');
    });

    it('should report paradox to brain and not emit if severity is low', () => {
        monitor.reportParadoxToBrain('chunk-1', 'MOVEMENT_GLITCH');

        const emitterMock = (monitor as any).emitter;
        expect(emitterMock.emit).not.toHaveBeenCalled();
    });

    it('should emit REALITY_FISSURE_ISOLATION when critical threshold is reached', () => {
        for (let i = 0; i < 5; i++) {
            monitor.reportParadoxToBrain('chunk-critical', 'STUCK_IN_GEOMETRY');
        }

        const emitterMock = (monitor as any).emitter;
        expect(emitterMock.emit).toHaveBeenCalledWith(
            'REALITY_FISSURE_ISOLATION',
            expect.objectContaining({
                message: expect.stringContaining('Critical Reality Fissure detected in chunk chunk-critical'),
                fissure: expect.objectContaining({
                    chunkId: 'chunk-critical',
                    paradoxCount: 5
                })
            }),
            'CRITICAL',
            'FISSURE_WATCHDOG'
        );
    });

    it('should handle multiple chunks independently', () => {
        for (let i = 0; i < 5; i++) {
            monitor.reportParadoxToBrain('chunk-A', 'PARADOX_A');
        }

        monitor.reportParadoxToBrain('chunk-B', 'PARADOX_B');

        const emitterMock = (monitor as any).emitter;

        expect(emitterMock.emit).toHaveBeenCalledWith(
            'REALITY_FISSURE_ISOLATION',
            expect.objectContaining({
                fissure: expect.objectContaining({ chunkId: 'chunk-A' })
            }),
            'CRITICAL',
            'FISSURE_WATCHDOG'
        );

        const calls = emitterMock.emit.mock.calls;
        const chunkBCalls = calls.filter((call: any) => call[1].fissure.chunkId === 'chunk-B');
        expect(chunkBCalls.length).toBe(0);
    });
});
