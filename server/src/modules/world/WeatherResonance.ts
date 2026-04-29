export enum WeatherType {
    CLEAR = 'CLEAR',
    RAIN = 'RAIN',
    STORM = 'STORM',
    SNOW = 'SNOW'
}

export class WeatherResonance {
    private static readonly weatherIntensity: Record<WeatherType, number> = {
        [WeatherType.CLEAR]: 0.001,
        [WeatherType.RAIN]: 0.005,
        [WeatherType.STORM]: 0.01,
        [WeatherType.SNOW]: 0.002
    };

    private static readonly baseResonance: number = 1.0;

    /**
     * Berechnet den deterministischen Resonanzwert basierend auf dem Welt-Tick und dem Wettertyp.
     * @param tickCount Der aktuelle Tick-Zähler der Welt.
     * @param currentWeather Der aktuell aktive Wettertyp.
     * @returns Der berechnete Resonanzwert.
     */
    public static calculateResonance(tickCount: number, currentWeather: WeatherType): number {
        const intensity = this.weatherIntensity[currentWeather] ?? 0;
        return this.baseResonance * Math.sin(tickCount * intensity);
    }

    /**
     * Gibt die Intensitäts-Map zurück.
     */
    public static getWeatherIntensityMap(): Record<WeatherType, number> {
        return { ...this.weatherIntensity };
    }
}