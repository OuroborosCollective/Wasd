export class WeatherSystem {
  private states = ["clear", "rain", "storm", "fog", "snow", "heatwave"];
  private current: string = "clear";

  nextWeather(seed: number) {
    this.current = this.states[Math.abs(seed) % this.states.length];
    return this.current;
  }

  getCurrent() {
    return this.current;
  }
}
