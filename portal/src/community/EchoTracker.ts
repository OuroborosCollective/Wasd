interface BeaconIntensity {
    intensity: number;
    label: string;
}

class EchoTracker {
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

    public renderSignalWave(intensity: number): string {
        return `opacity: ${intensity}; transform: scale(${intensity});`;
    }
}