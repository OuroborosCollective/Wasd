export class WarForecast {
  evaluate(tension: number, resources: number) {
    return { risk: Math.min(1, (tension * 0.7) + (resources * 0.3)) };
  }
}