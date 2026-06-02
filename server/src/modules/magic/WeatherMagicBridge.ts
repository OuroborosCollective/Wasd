export class WeatherMagicBridge {
  public calculatePotency(spellType: string, weather: string): number {
    let multiplier = 1.0;
    switch (spellType.toLowerCase()) {
      case "fire":
        if (weather === "heatwave") multiplier = 1.5;
        else if (weather === "rain" || weather === "storm") multiplier = 0.5;
        break;
      case "water":
        if (weather === "rain") multiplier = 1.5;
        else if (weather === "heatwave") multiplier = 0.5;
        break;
      case "lightning":
        if (weather === "storm") multiplier = 1.5;
        break;
      case "frost":
        if (weather === "snow") multiplier = 1.5;
        else if (weather === "heatwave") multiplier = 0.5;
        break;
    }
    return multiplier;
  }
}
