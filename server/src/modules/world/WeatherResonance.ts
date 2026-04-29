export enum WeatherEnum {
    CLEAR = 'CLEAR',
    RAIN = 'RAIN',
    STORM = 'STORM',
    SNOW = 'SNOW'
}

export class WeatherResonance {
    private static readonly weatherIntensity: Record<WeatherEnum, number> = {
        [WeatherEnum.CLEAR]: 0.001,
        [WeatherEnum.RAIN]: 0.005,
        [WeatherEnum.STORM]: 0.01,
        [WeatherEnum.SNOW]: 0.002
    };

    private currentWeather: WeatherEnum = WeatherEnum.CLEAR;

    /**
     * Berechnet den deterministischen Resonanzwert basierend auf dem Welt-Tick, Wettertyp und Basisresonanz.
     * @param tickCount Der aktuelle Tick-Zähler der Welt.
     * @param weather Der zu berechnende Wetterzustand.
     * @param baseResonance Der Basiswert für die Resonanz.
     * @returns Der berechnete Resonanzwert.
     */
    public static calculateResonance(tickCount: number, weather: WeatherEnum, baseResonance: number): number {
        const intensity = WeatherResonance.weatherIntensity[weather] ?? 0;
        return baseResonance * Math.sin(tickCount * intensity);
    }

    /**
     * Setzt den aktuellen Wetterzustand des Servers.
     * @param weather Das neue Wetter.
     */
    public setWeather(weather: WeatherEnum): void {
        this.currentWeather = weather;
    }

    /**
     * Gibt den aktuellen Wetterzustand des Servers zurück.
     */
    public getCurrentWeather(): WeatherEnum {
        return this.currentWeather;
    }

    /**
     * Gibt die statische Intensitäts-Map zurück.
     */
    public static getWeatherIntensityMap(): Record<WeatherEnum, number> {
        return { ...WeatherResonance.weatherIntensity };
    }
}