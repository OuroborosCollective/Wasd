/**
 * WeatherFarmingBridge provides deterministic growth multipliers based on weather conditions.
 */
export class WeatherFarmingBridge {
  /**
   * Returns a growth multiplier based on the current weather state.
   * @param weather The current weather state (e.g., 'clear', 'rain', 'storm', 'fog', 'snow', 'heatwave')
   */
  public static getGrowthMultiplier(weather: string): number {
    switch (weather) {
      case "rain":
        return 1.5;
      case "storm":
        return 0.8;
      case "fog":
        return 0.9;
      case "snow":
        return 0.5;
      case "heatwave":
        return 1.2;
      case "clear":
      default:
        return 1.0;
    }
  }
}
