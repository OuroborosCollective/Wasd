export class WeatherCombatBridge {
  /**
   * Returns a multiplier for hit chance based on weather.
   * Fog and storms significantly reduce visibility and accuracy.
   */
  public static getHitMultiplier(weather: string): number {
    switch (weather) {
      case "rain":
        return 0.95;
      case "storm":
        return 0.85;
      case "fog":
        return 0.8;
      case "snow":
        return 0.9;
      case "clear":
      default:
        return 1.0;
    }
  }

  /**
   * Returns a multiplier for damage based on weather.
   * Storms increase chaos and impact, while snow might dampen it.
   */
  public static getDamageMultiplier(weather: string): number {
    switch (weather) {
      case "storm":
        return 1.1;
      case "snow":
        return 0.9;
      case "clear":
      case "rain":
      case "fog":
      default:
        return 1.0;
    }
  }
}
