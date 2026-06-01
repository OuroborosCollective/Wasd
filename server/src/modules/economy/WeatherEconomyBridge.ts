export class WeatherEconomyBridge {
  public getPriceMultiplier(itemId: string, weather: string): number {
    let multiplier = 1.0;

    switch (itemId.toLowerCase()) {
      case "wood":
      case "timber":
        if (weather === "storm" || weather === "rain") multiplier = 1.5;
        break;
      case "mushrooms":
      case "herbs":
        if (weather === "rain") multiplier = 0.8; // More supply during rain
        break;
      case "water":
      case "ice":
        if (weather === "heatwave") multiplier = 2.0;
        break;
      case "wool":
      case "fur":
        if (weather === "snow") multiplier = 1.4;
        break;
    }

    return multiplier;
  }
}
