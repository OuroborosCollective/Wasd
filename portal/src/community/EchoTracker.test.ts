import { describe, it, expect, beforeEach } from 'vitest';
import { EchoTracker } from './EchoTracker';

describe('EchoTracker', () => {
    let echoTracker: EchoTracker;

    beforeEach(() => {
        echoTracker = new EchoTracker();
    });

    describe('getBeaconData', () => {
        it('should return 0.95 for COMBAT signal type', () => {
            const data = echoTracker.getBeaconData('COMBAT');
            expect(data.intensity).toBe(0.95);
        });

        it('should return 0.8 for COLLECT signal type', () => {
            const data = echoTracker.getBeaconData('COLLECT');
            expect(data.intensity).toBe(0.8);
        });

        it('should return 0.7 for TALK_TO signal type', () => {
            const data = echoTracker.getBeaconData('TALK_TO');
            expect(data.intensity).toBe(0.7);
        });

        it('should return 0.5 as fallback for unknown signal types', () => {
            const data = echoTracker.getBeaconData('UNKNOWN_TYPE');
            expect(data.intensity).toBe(0.5);
        });
    });

    describe('renderSignalWave', () => {
        it('should return correctly formatted CSS string', () => {
            const intensity = 0.5;
            const result = echoTracker.renderSignalWave(intensity);
            
            const expectedCss = 'opacity: 0.5; transform: scale(0.5);';
            expect(result).toBe(expectedCss);
        });

        it('should handle edge case with 0 intensity correctly', () => {
            const result = echoTracker.renderSignalWave(0);
            expect(result).toContain('opacity: 0;');
            expect(result).toContain('transform: scale(0);');
        });

        it('should handle edge case with 1 intensity correctly', () => {
            const result = echoTracker.renderSignalWave(1);
            expect(result).toContain('opacity: 1;');
            expect(result).toContain('transform: scale(1);');
        });
    });
});
