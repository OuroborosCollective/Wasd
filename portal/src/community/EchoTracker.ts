export interface BeaconIntensity {
    intensity: number;
    label: string;
}

export class EchoTracker {
    private static readonly intensityMap: Record<string, number> = {
        COMBAT: 0.95,
        COLLECT: 0.80,
        TALK_TO: 0.70
    };

    public getBeaconData(questType: string): BeaconIntensity {
        const normalizedType = questType.toUpperCase();
        const intensity = EchoTracker.intensityMap[normalizedType] !== undefined 
            ? EchoTracker.intensityMap[normalizedType] 
            : 0.50;
        
        const label = `Signal-Echo: ${Math.round(intensity * 100)}%`;
        
        return {
            intensity,
            label
        };
    }

    public getSignalStrength(type: string): number {
        const strengthMap: Record<string, number> = {
            COMBAT: 1.0,
            COLLECT: 0.7,
            TALK_TO: 0.4
        };
        return strengthMap[type.toUpperCase()] || 0.1;
    }

    public renderSignalWave(type: string, strength: number): { label: string; css: string } {
        const percentage = Math.round(strength * 100);
        const scale = 1 + strength;
        return {
            label: `Signal: ${type} (${percentage}%)`,
            css: `opacity: ${strength}; transform: scale(${scale}); animation-duration: 2s;`
        };
    }
}