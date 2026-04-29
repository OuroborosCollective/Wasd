export type TemperatureUnit = 'Celsius' | 'Fahrenheit';

export type WeatherCondition =
  | 'Sunny'
  | 'Cloudy'
  | 'Partly Cloudy'
  | 'Rainy'
  | 'Stormy'
  | 'Snowy'
  | 'Foggy';

export interface WeatherData {
  temperature: number;
  unit: TemperatureUnit;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  timestamp: Date;
  location: string;
}

export interface Forecast {
  date: Date;
  minTemp: number;
  maxTemp: number;
  condition: WeatherCondition;
}