import { describe, it, expect, beforeEach } from "vitest";
import { WeatherEconomyBridge } from "../modules/economy/WeatherEconomyBridge.js";

describe("WeatherEconomyBridge", () => {
  let bridge: WeatherEconomyBridge;

  beforeEach(() => {
    bridge = new WeatherEconomyBridge();
  });

  it("returns 1.0 for clear weather by default", () => {
    expect(bridge.getPriceMultiplier("clear", "wood")).toBe(1.0);
    expect(bridge.getPriceMultiplier("clear", "water")).toBe(1.0);
  });

  it("increases price for wood and metal during storm", () => {
    expect(bridge.getPriceMultiplier("storm", "wood")).toBe(1.5);
    expect(bridge.getPriceMultiplier("storm", "metal")).toBe(1.5);
  });

  it("increases price for fish during storm significantly", () => {
    expect(bridge.getPriceMultiplier("storm", "fish")).toBe(1.8);
  });

  it("decreases price for mushrooms and herbs during rain", () => {
    expect(bridge.getPriceMultiplier("rain", "mushroom")).toBe(0.8);
    expect(bridge.getPriceMultiplier("rain", "herbs")).toBe(0.8);
  });

  it("increases price for fire_essence during rain", () => {
    expect(bridge.getPriceMultiplier("rain", "fire_essence")).toBe(1.4);
  });

  it("increases food prices during snow", () => {
    expect(bridge.getPriceMultiplier("snow", "food")).toBe(1.3);
    expect(bridge.getPriceMultiplier("snow", "grain")).toBe(1.3);
  });

  it("decreases ice_essence price during snow", () => {
    expect(bridge.getPriceMultiplier("snow", "ice_essence")).toBe(0.7);
  });

  it("increases water price significantly during heatwave", () => {
    expect(bridge.getPriceMultiplier("heatwave", "water")).toBe(2.0);
  });

  it("increases ice_essence price significantly during heatwave", () => {
    expect(bridge.getPriceMultiplier("heatwave", "ice_essence")).toBe(2.5);
  });

  it("decreases fire_essence price during heatwave", () => {
    expect(bridge.getPriceMultiplier("heatwave", "fire_essence")).toBe(0.6);
  });

  it("increases rare_herbs price during fog", () => {
    expect(bridge.getPriceMultiplier("fog", "rare_herbs")).toBe(1.2);
  });

  it("is case-insensitive for weather and item types", () => {
    expect(bridge.getPriceMultiplier("STORM", "WOOD")).toBe(1.5);
    expect(bridge.getPriceMultiplier("Rain", "Mushroom")).toBe(0.8);
  });

  it("returns 1.0 for unknown combinations", () => {
    expect(bridge.getPriceMultiplier("clear", "unknown_item")).toBe(1.0);
    expect(bridge.getPriceMultiplier("unknown_weather", "wood")).toBe(1.0);
  });
});
