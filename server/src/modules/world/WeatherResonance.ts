// @ts-nocheck
export enum WeatherType {
    CLEAR = "CLEAR",
    RAIN = "RAIN",
    STORM = "STORM",
    SNOW = "SNOW",
    FOG = "FOG"
}

export interface AREPayload {
    resonance: number;
    [key: string]: any;
}

export interface WorldTick {
    tickCount: number;
}

export class WeatherResonance {
    private static readonly weatherIntensity: Record<WeatherType, number> = {
        [WeatherType.CLEAR]: 0.01,
        [WeatherType.RAIN]: 0.05,
        [WeatherType.STORM]: 0.12,
        [WeatherType.SNOW]: 0.03,
        [WeatherType.FOG]: 0.02
    };

    /**
     * Calculates the resonance for the AREPayload based on weather and world ticks.
     * Synchronized to the 10-Hz system clock via worldTick.tickCount.
     * 
     * @param payload The payload to update
     * @param baseResonance The base resonance value
     * @param worldTick The current world tick state
     * @param currentWeather The current active weather
     */
    public static calculate(
        payload: AREPayload,
        baseResonance: number,
        worldTick: WorldTick,
        currentWeather: WeatherType
    ): void {
        const intensity = this.weatherIntensity[currentWeather] || 0.01;
        
        // Logic: payload.resonance = baseResonance * Math.sin(worldTick.tickCount * weatherIntensity[currentWeather])
        payload.resonance = baseResonance * Math.sin(worldTick.tickCount * intensity);
    }
}