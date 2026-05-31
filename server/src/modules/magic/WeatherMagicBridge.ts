export class WeatherMagicBridge {
  static getPotencyMultiplier(weather: string, spellType: string): number {
    const multipliers: Record<string, Record<string, number>> = {
      fire: {
        heatwave: 1.5,
        rain: 0.5,
        storm: 0.5,
      },
      water: {
        rain: 1.5,
        heatwave: 0.5,
      },
      lightning: {
        storm: 1.5,
      },
      frost: {
        snow: 1.5,
        heatwave: 0.5,
      },
    };

    return multipliers[spellType]?.[weather] ?? 1.0;
  }
}
