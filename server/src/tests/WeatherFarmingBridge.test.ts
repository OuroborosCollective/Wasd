import { describe, it, expect } from "vitest";
import { WeatherFarmingBridge } from "../modules/farming/WeatherFarmingBridge.js";

describe("WeatherFarmingBridge", () => {
  it("returns 1.5 multiplier for rain", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("rain")).toBe(1.5);
  });

  it("returns 0.8 multiplier for storm", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("storm")).toBe(0.8);
  });

  it("returns 0.9 multiplier for fog", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("fog")).toBe(0.9);
  });

  it("returns 0.5 multiplier for snow", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("snow")).toBe(0.5);
  });

  it("returns 1.2 multiplier for heatwave", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("heatwave")).toBe(1.2);
  });

  it("returns 1.0 multiplier for clear", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("clear")).toBe(1.0);
  });

  it("returns 1.0 multiplier for unknown weather", () => {
    expect(WeatherFarmingBridge.getGrowthMultiplier("apocalypse")).toBe(1.0);
  });
});
