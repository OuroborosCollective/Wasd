import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createInitialProtocolState } from './ProtocolCore';

describe('ProtocolCore', () => {
    describe('createInitialProtocolState', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(1641769200000));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should create initial state with default logicalIndex of 0', () => {
            const state = createInitialProtocolState();

            expect(state).toEqual({
                logicalIndex: 0,
                cycleCount: 0,
                integrityHash: 0,
                lastUpdate: 1641769200000
            });
        });

        it('should create initial state with provided logicalIndex', () => {
            const state = createInitialProtocolState(42);

            expect(state).toEqual({
                logicalIndex: 42,
                cycleCount: 0,
                integrityHash: 0,
                lastUpdate: 1641769200000
            });
        });

        it('should convert negative index to unsigned 32-bit integer', () => {
            // -1 >>> 0 is 4294967295
            const state = createInitialProtocolState(-1);

            expect(state).toEqual({
                logicalIndex: 4294967295,
                cycleCount: 0,
                integrityHash: 0,
                lastUpdate: 1641769200000
            });
        });
    });
});
