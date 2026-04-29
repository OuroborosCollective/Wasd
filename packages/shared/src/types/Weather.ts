export enum WeatherCondition {
  Sunny = 'Sunny',
  Clear = 'Clear',
  PartlyCloudy = 'PartlyCloudy',
  Cloudy = 'Cloudy',
  Overcast = 'Overcast',
  Mist = 'Mist',
  PatchyRainPossible = 'PatchyRainPossible',
  PatchySnowPossible = 'PatchySnowPossible',
  PatchySleetPossible = 'PatchySleetPossible',
  PatchyFreezingDrizzlePossible = 'PatchyFreezingDrizzlePossible',
  ThunderyOutbreaksPossible = 'ThunderyOutbreaksPossible',
  BlowingSnow = 'BlowingSnow',
  Blizzard = 'Blizzard',
  Fog = 'Fog',
  FreezingFog = 'FreezingFog',
  PatchyLightDrizzle = 'PatchyLightDrizzle',
  LightDrizzle = 'LightDrizzle',
  FreezingDrizzle = 'FreezingDrizzle',
  HeavyFreezingDrizzle = 'HeavyFreezingDrizzle',
  PatchyLightRain = 'PatchyLightRain',
  LightRain = 'LightRain',
  ModerateRainAtTimes = 'ModerateRainAtTimes',
  ModerateRain = 'ModerateRain',
  HeavyRainAtTimes = 'HeavyRainAtTimes',
  HeavyRain = 'HeavyRain',
  LightFreezingRain = 'LightFreezingRain',
  ModerateOrHeavyFreezingRain = 'ModerateOrHeavyFreezingRain',
  LightSleet = 'LightSleet',
  ModerateOrHeavySleet = 'ModerateOrHeavySleet',
  PatchyLightSnow = 'PatchyLightSnow',
  LightSnow = 'LightSnow',
  PatchyModerateSnow = 'PatchyModerateSnow',
  ModerateSnow = 'ModerateSnow',
  PatchyHeavySnow = 'PatchyHeavySnow',
  HeavySnow = 'HeavySnow',
  IcePellets = 'IcePellets',
  LightRainShower = 'LightRainShower',
  ModerateOrHeavyRainShower = 'ModerateOrHeavyRainShower',
  TorrentialRainShower = 'TorrentialRainShower',
  LightSleetShowers = 'LightSleetShowers',
  ModerateOrHeavySleetShowers = 'ModerateOrHeavySleetShowers',
  LightSnowShowers = 'LightSnowShowers',
  ModerateOrHeavySnowShowers = 'ModerateOrHeavySnowShowers',
  LightShowersOfIcePellets = 'LightShowersOfIcePellets',
  ModerateOrHeavyShowersOfIcePellets = 'ModerateOrHeavyShowersOfIcePellets',
  PatchyLightRainWithThunder = 'PatchyLightRainWithThunder',
  ModerateOrHeavyRainWithThunder = 'ModerateOrHeavyRainWithThunder',
  PatchyLightSnowWithThunder = 'PatchyLightSnowWithThunder',
  ModerateOrHeavySnowWithThunder = 'ModerateOrHeavySnowWithThunder'
}

export interface WeatherCoordinates {
  lat: number;
  lon: number;
}

export interface WeatherLocation extends WeatherCoordinates {
  name: string;
  region: string;
  country: string;
  tz_id?: string;
  localtime_epoch?: number;
  localtime?: string;
}

export interface WeatherBaseMetrics {
  temp_c: number;
  temp_f: number;
  is_day: number;
  condition: {
    text: string;
    icon: string;
    code: number;
  };
  wind_mph: number;
  wind_kph: number;
  wind_degree: number;
  wind_dir: string;
  pressure_mb: number;
  pressure_in: number;
  precip_mm: number;
  precip_in: number;
  humidity: number;
  cloud: number;
  feelslike_c: number;
  feelslike_f: number;
  vis_km: number;
  vis_miles: number;
  uv: number;
  gust_mph: number;
  gust_kph: number;
}

export interface CurrentWeather extends WeatherBaseMetrics {
  last_updated_epoch: number;
  last_updated: string;
}

export interface ForecastDayData {
  date: string;
  date_epoch: number;
  day: {
    maxtemp_c: number;
    maxtemp_f: number;
    mintemp_c: number;
    mintemp_f: number;
    avgtemp_c: number;
    avgtemp_f: number;
    maxwind_mph: number;
    maxwind_kph: number;
    totalprecip_mm: number;
    totalprecip_in: number;
    totalsnow_cm: number;
    avgvis_km: number;
    avgvis_miles: number;
    avghumidity: number;
    daily_will_it_rain: number;
    daily_chance_of_rain: number;
    daily_will_it_snow: number;
    daily_chance_of_snow: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    uv: number;
  };
  astro: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
    moon_phase: string;
    moon_illumination: string;
    is_moon_up: number;
    is_sun_up: number;
  };
  hour: Array<WeatherBaseMetrics & {
    time_epoch: number;
    time: string;
    will_it_rain: number;
    chance_of_rain: number;
    will_it_snow: number;
    chance_of_snow: number;
  }>;
}

export interface WeatherForecastResponse {
  location: WeatherLocation;
  current: CurrentWeather;
  forecast: {
    forecastday: ForecastDayData[];
  };
}

export type TemperatureUnit = 'C' | 'F';
export type WindSpeedUnit = 'KPH' | 'MPH';

export interface WeatherDisplaySettings {
  tempUnit: TemperatureUnit;
  windUnit: WindSpeedUnit;
}