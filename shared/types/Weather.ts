export enum WeatherEnum {
    CLEAR = "CLEAR",
    RAIN = "RAIN",
    STORM = "STORM",
    SNOW = "SNOW"
}

export const WeatherIntensity: Record<WeatherEnum, number> = {
    [WeatherEnum.CLEAR]: 0.02,
    [WeatherEnum.RAIN]: 0.08,
    [WeatherEnum.STORM]: 0.15,
    [WeatherEnum.SNOW]: 0.05
};

export interface IWeatherState {
    type: WeatherEnum;
    intensity: number;
    duration: number;
}

export interface IWeatherData {
    current: IWeatherState;
    forecast: WeatherEnum[];
    timestamp: number;
}

export interface IWeatherConfig {
    transitionDuration: number;
    updateInterval: number;
    minIntensity: number;
    maxIntensity: number;
}