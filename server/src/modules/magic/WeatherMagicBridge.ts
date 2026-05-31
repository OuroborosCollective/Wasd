export type WeatherState = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'heatwave';
export type MagicElement = 'fire' | 'water' | 'lightning' | 'frost';

export class WeatherMagicBridge {
  private static readonly multipliers: Record<WeatherState, Partial<Record<MagicElement, number>>> = {
    clear: {
      fire: 1.1,
    },
    rain: {
      water: 1.2,
      fire: 0.8,
      lightning: 1.1,
    },
    storm: {
      lightning: 1.5,
      water: 1.1,
      fire: 0.5,
    },
    fog: {
      frost: 1.1,
    },
    snow: {
      frost: 1.3,
      fire: 0.7,
    },
    heatwave: {
      fire: 1.4,
      water: 0.6,
      frost: 0.5,
    },
  };

  public static getMultiplier(element: MagicElement, weather: WeatherState): number {
    return this.multipliers[weather]?.[element] ?? 1.0;
  }
}
