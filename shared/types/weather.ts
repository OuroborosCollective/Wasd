export enum WeatherEnum {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  STORM = 'STORM',
  BLIZZARD = 'BLIZZARD'
}

export const weatherIntensity: Record<WeatherEnum, number> = {
  [WeatherEnum.CLEAR]: 0.0,
  [WeatherEnum.RAIN]: 0.4,
  [WeatherEnum.STORM]: 1.2,
  [WeatherEnum.BLIZZARD]: 2.5
};