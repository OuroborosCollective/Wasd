export enum WeatherEnum {
    CLEAR = "CLEAR",
    RAIN = "RAIN",
    STORM = "STORM",
    SNOW = "SNOW"
}

export const weatherIntensity: Record<WeatherEnum, number> = {
    [WeatherEnum.CLEAR]: 0.02,
    [WeatherEnum.RAIN]: 0.08,
    [WeatherEnum.STORM]: 0.15,
    [WeatherEnum.SNOW]: 0.05
};