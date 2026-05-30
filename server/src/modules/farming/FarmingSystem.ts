import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";
import { WeatherFarmingBridge } from "./WeatherFarmingBridge.js";

export class FarmingSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  plant(seedId: string, plotId: string, weather: string = "clear") {
    const multiplier = WeatherFarmingBridge.getGrowthMultiplier(weather);
    return {
      seedId,
      plotId,
      plantedAt: this.clock.now(),
      growthMultiplier: multiplier
    };
  }
}
