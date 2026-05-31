import { describe, it, expect } from "vitest";
import { WeatherEconomyBridge } from "../modules/economy/WeatherEconomyBridge.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";

describe("WeatherEconomyBridge", () => {
  it("should provide 1.5x multiplier for Wood in storm", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("wood", "storm")).toBe(1.5);
  });

  it("should provide 0.8x multiplier for Mushrooms in rain", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("mushrooms", "rain")).toBe(0.8);
  });

  it("should provide 2.0x multiplier for Water in heatwave", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("water", "heatwave")).toBe(2.0);
  });

  it("should provide 1.8x multiplier for Fish in storm", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("fish", "storm")).toBe(1.8);
  });

  it("should provide 1.0x multiplier for unrelated items", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("iron_sword", "storm")).toBe(1.0);
  });
});

describe("EconomySystem Integration", () => {
  const economy = new EconomySystem();

  it("should adjust wood price in storm", () => {
    const basePrice = economy.getPrice("wood", "clear");
    const stormPrice = economy.getPrice("wood", "storm");
    expect(stormPrice).toBe(Math.floor(basePrice * 1.5));
  });

  it("should adjust water price in heatwave", () => {
    const basePrice = economy.getPrice("water", "clear");
    const heatwavePrice = economy.getPrice("water", "heatwave");
    expect(heatwavePrice).toBe(Math.floor(basePrice * 2.0));
  });

  it("should show adjusted prices in shop during heatwave", () => {
    const shop = economy.getShop("general", "heatwave");
    const waterItem = shop.find(i => i.itemId === "water");
    expect(waterItem?.buyPrice).toBe(10); // 5 * 2.0
  });
});
