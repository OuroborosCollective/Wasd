import { WeatherFarmingBridge } from "../farming/WeatherFarmingBridge.js";

export class FarmingSystem {
  plant(seedId: string, biome: string, tick: number) {
    return {
      seedId,
      biome,
      plantedAt: tick,
      growth: 0
    };
  }

  tick(crop: any, weather: string = "clear") {
    const multiplier = WeatherFarmingBridge.getGrowthMultiplier(weather);
    crop.growth += 1 * multiplier;
    return crop;
  }
}