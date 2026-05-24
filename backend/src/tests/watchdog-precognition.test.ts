import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchdogPrecognitionMonitor } from '../core/watchdog-precognition.js';

vi.mock('../core/watchdog-emitter.js', () => {
    return {
        WatchdogEmitter: vi.fn().mockImplementation(function() {
            return {
                emit: vi.fn()
            };
        })
    };
});

vi.mock('../../../server/src/modules/brain/MatrixPrecognitionBrain.js', () => {
    return {
        MatrixPrecognitionBrain: vi.fn().mockImplementation(function() {
            return {
                recordState: vi.fn(),
                analyzeMatrixFlux: vi.fn()
            };
        })
    };
});

describe('WatchdogPrecognitionMonitor', () => {
    let monitor: WatchdogPrecognitionMonitor;
    let mockEmitter: any;
    let mockBrain: any;

    beforeEach(() => {
        vi.clearAllMocks();
        monitor = new WatchdogPrecognitionMonitor('ws://localhost:9999');
        // Accessing private members for testing purposes
        mockEmitter = (monitor as any).emitter;
        mockBrain = (monitor as any).brain;
    });

    it('should feed data to the brain and call evaluate', () => {
        mockBrain.analyzeMatrixFlux.mockReturnValue({
            projectedLoad: 0.1,
            densitySpikeRisk: 0.1,
            timeToCritical: -1
        });

        monitor.feedData(100, 50);

        expect(mockBrain.recordState).toHaveBeenCalledWith(100, 50);
        expect(mockBrain.analyzeMatrixFlux).toHaveBeenCalled();
    });

    it('should emit MATRIX_OVERLOAD_PREDICTION when projectedLoad > 0.8', () => {
        const mockData = {
            projectedLoad: 0.85,
            densitySpikeRisk: 0.1,
            timeToCritical: 10000
        };
        mockBrain.analyzeMatrixFlux.mockReturnValue(mockData);

        monitor.feedData(1000, 1000);

        expect(mockEmitter.emit).toHaveBeenCalledWith(
            'MATRIX_OVERLOAD_PREDICTION',
            expect.objectContaining({
                data: mockData
            }),
            'HIGH',
            'PRECOGNITION_WATCHDOG'
        );
    });

    it('should emit DENSITY_SPIKE_WARNING when densitySpikeRisk > 0.7', () => {
        const mockData = {
            projectedLoad: 0.1,
            densitySpikeRisk: 0.75,
            timeToCritical: 5000
        };
        mockBrain.analyzeMatrixFlux.mockReturnValue(mockData);

        monitor.feedData(500, 500);

        expect(mockEmitter.emit).toHaveBeenCalledWith(
            'DENSITY_SPIKE_WARNING',
            expect.objectContaining({
                data: mockData
            }),
            'MEDIUM',
            'PRECOGNITION_WATCHDOG'
        );
    });

    it('should emit both alerts if both thresholds are exceeded', () => {
        const mockData = {
            projectedLoad: 0.9,
            densitySpikeRisk: 0.8,
            timeToCritical: 1000
        };
        mockBrain.analyzeMatrixFlux.mockReturnValue(mockData);

        monitor.feedData(2000, 2000);

        expect(mockEmitter.emit).toHaveBeenCalledTimes(2);
        expect(mockEmitter.emit).toHaveBeenCalledWith('MATRIX_OVERLOAD_PREDICTION', expect.anything(), 'HIGH', 'PRECOGNITION_WATCHDOG');
        expect(mockEmitter.emit).toHaveBeenCalledWith('DENSITY_SPIKE_WARNING', expect.anything(), 'MEDIUM', 'PRECOGNITION_WATCHDOG');
    });

    it('should not emit anything if thresholds are not met', () => {
        mockBrain.analyzeMatrixFlux.mockReturnValue({
            projectedLoad: 0.5,
            densitySpikeRisk: 0.5,
            timeToCritical: -1
        });

        monitor.feedData(10, 10);

        expect(mockEmitter.emit).not.toHaveBeenCalled();
    });
});
