import { type WeatherState } from "../magic/WeatherMagicBridge.js";

export interface MonsterWeatherStats {
  aggression: number;
  strength: number;
  speed: number;
  intelligence: number;
  resilience: number;
}

export class WeatherMonsterBridge {
  private static readonly weatherModifiers: Record<WeatherState, Partial<MonsterWeatherStats>> = {
    clear: {
      speed: 1.05,
      intelligence: 1.05,
    },
    rain: {
      speed: 0.9,
      aggression: 1.1,
    },
    storm: {
      aggression: 1.3,
      strength: 1.2,
      intelligence: 0.8,
    },
    fog: {
      speed: 0.8,
      intelligence: 1.2,
    },
    snow: {
      speed: 0.85,
      resilience: 1.2,
    },
    heatwave: {
      aggression: 1.2,
      strength: 1.1,
      speed: 0.95,
    },
  };

  public static getStatsModifier(weather: WeatherState): MonsterWeatherStats {
    const base = { aggression: 1, strength: 1, speed: 1, intelligence: 1, resilience: 1 };
    const mods = this.weatherModifiers[weather] || {};
    return { ...base, ...mods };
  }

  public static getWeatherMutations(weather: WeatherState): string[] {
    switch (weather) {
      case 'storm': return ['storm_frenzy'];
      case 'fog': return ['mist_stalker'];
      case 'snow': return ['frost_hide'];
      case 'heatwave': return ['sun_scorch'];
      default: return [];
    }
  }
}
