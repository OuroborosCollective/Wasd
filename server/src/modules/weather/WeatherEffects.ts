export class WeatherEffects {
  apply(weather: string) {
    return {
      visibilityPenalty: weather === "fog" ? 0.3 : 0,
      movementPenalty: weather === "storm" ? 0.2 : 0
    };
  }
}