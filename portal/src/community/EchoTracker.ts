export interface BeaconIntensity {
    intensity: number;
    label: string;
}

export interface SignalWaveResult {
    label: string;
    css: string;
}

export class EchoTracker {
    private static readonly intensityMap: Record<string, number> = {
        COMBAT: 1.0,
        COLLECT: 0.7,
        TALK_TO: 0.4
    };

    public getSignalStrength(questType: string): number {
        const normalizedType = questType.toUpperCase();
        return EchoTracker.intensityMap[normalizedType] !== undefined
            ? EchoTracker.intensityMap[normalizedType] 
            : 0.1;
    }

    public renderSignalWave(type: string, strength: number): SignalWaveResult {
        const percentage = Math.round(strength * 100);
        return {
            label: `Signal: ${type.toUpperCase()} (${percentage}%)`,
            css: `opacity: ${strength}; transform: scale(${1 + strength}); animation-duration: 2s;`
        };
    }
}
