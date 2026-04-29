export enum WeatherType {
  CLEAR = 'CLEAR',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  STORM = 'STORM',
  FOGGY = 'FOGGY',
  SNOW = 'SNOW'
}

export const WEATHER_INTENSITY: Record<WeatherType, number> = {
  [WeatherType.CLEAR]: 0.1,
  [WeatherType.CLOUDY]: 0.3,
  [WeatherType.RAIN]: 0.6,
  [WeatherType.STORM]: 1.0,
  [WeatherType.FOGGY]: 0.4,
  [WeatherType.SNOW]: 0.5
};