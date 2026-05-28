/**
 * WeatherFarmingBridge provides deterministic growth multipliers for crops
 * based on current weather conditions.
 */
export class WeatherFarmingBridge {
  /**
   * Returns a growth multiplier based on the weather state.
   * @param weather The current weather state (e.g., 'rain', 'heatwave', 'clear')
   * @returns A multiplier to be applied to crop growth per tick.
   */
  static getGrowthMultiplier(weather: string): number {
    switch (weather) {
      case 'rain':
        return 1.5;
      case 'storm':
        return 1.2;
      case 'heatwave':
        return 0.5;
      case 'snow':
        return 0.3;
      case 'fog':
        return 0.8;
      case 'clear':
      default:
        return 1.0;
    }
  }
}
