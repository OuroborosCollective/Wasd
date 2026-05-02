import { describe, it, expect, beforeEach } from 'vitest';
import { EchoTracker } from './EchoTracker';

describe('EchoTracker', () => {
    let echoTracker: EchoTracker;

    beforeEach(() => {
        echoTracker = new EchoTracker();
    });

    describe('getSignalStrength', () => {
        it('should return 1.0 for COMBAT signal type', () => {
            const strength = echoTracker.getSignalStrength('COMBAT');
            expect(strength).toBe(1.0);
        });

        it('should return 0.7 for COLLECT signal type', () => {
            const strength = echoTracker.getSignalStrength('COLLECT');
            expect(strength).toBe(0.7);
        });

        it('should return 0.4 for TALK_TO signal type', () => {
            const strength = echoTracker.getSignalStrength('TALK_TO');
            expect(strength).toBe(0.4);
        });

        it('should return 0.1 as fallback for unknown signal types', () => {
            const strength = echoTracker.getSignalStrength('UNKNOWN_TYPE');
            expect(strength).toBe(0.1);
        });
    });

    describe('renderSignalWave', () => {
        it('should return correctly formatted label with percentage', () => {
            const type = 'COMBAT';
            const strength = 0.85;
            const result = echoTracker.renderSignalWave(type, strength);

            expect(result.label).toBe('Signal: COMBAT (85%)');
        });

        it('should return correctly formatted CSS string', () => {
            const type = 'COLLECT';
            const strength = 0.5;
            const result = echoTracker.renderSignalWave(type, strength);
            
            const expectedCss = 'opacity: 0.5; transform: scale(1.5); animation-duration: 2s;';
            expect(result.css).toBe(expectedCss);
        });

        it('should handle edge case with 0 strength correctly', () => {
            const result = echoTracker.renderSignalWave('TALK_TO', 0);

            expect(result.label).toBe('Signal: TALK_TO (0%)');
            expect(result.css).toContain('opacity: 0;');
        });

        it('should handle edge case with 1 strength correctly', () => {
            const result = echoTracker.renderSignalWave('COMBAT', 1);

            expect(result.label).toBe('Signal: COMBAT (100%)');
            expect(result.css).toContain('opacity: 1;');
        });
    });
});