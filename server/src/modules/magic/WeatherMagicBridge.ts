export type MagicElement = "fire" | "water" | "lightning" | "frost";
export type WeatherState = "clear" | "rain" | "storm" | "fog" | "snow" | "heatwave";

export class WeatherMagicBridge {
  private static readonly MULTIPLIERS: Record<WeatherState, Partial<Record<MagicElement, number>>> = {
    clear: {},
    rain: {
      water: 1.5,
      fire: 0.5,
      lightning: 1.2
    },
    storm: {
      lightning: 2.0,
      water: 1.2,
      fire: 0.5
    },
    fog: {
      water: 1.1,
      frost: 1.1
    },
    snow: {
      frost: 1.5,
      fire: 0.8
    },
    heatwave: {
      fire: 1.5,
      water: 0.5,
      frost: 0.5
    }
  };

  public static getMultiplier(element: MagicElement, weather: string | undefined): number {
    if (!weather) return 1.0;

    const state = weather.toLowerCase() as WeatherState;
    const weatherMods = this.MULTIPLIERS[state];

    if (!weatherMods) return 1.0;

    return weatherMods[element] ?? 1.0;
  }
}
