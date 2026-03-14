import { describe, it, expect, beforeEach } from "vitest";
import { ClimateModel } from "../modules/weather/ClimateModel.js";
import { WeatherEffects } from "../modules/weather/WeatherEffects.js";
import { WeatherPresets } from "../modules/weather/WeatherPresets.js";

// ---------------------------------------------------------------------------
// ClimateModel
// ---------------------------------------------------------------------------
describe("ClimateModel", () => {
  let climate: ClimateModel;

  beforeEach(() => { climate = new ClimateModel(); });

  it("forest biome yields 'temperate' climate", () => {
    expect(climate.getClimateForBiome("forest")).toBe("temperate");
  });

  it("desert biome yields 'arid' climate", () => {
    expect(climate.getClimateForBiome("desert")).toBe("arid");
  });

  it("mountain biome yields 'cold' climate", () => {
    expect(climate.getClimateForBiome("mountain")).toBe("cold");
  });

  it("unknown biome yields 'mixed' climate", () => {
    expect(climate.getClimateForBiome("swamp")).toBe("mixed");
  });

  it("grassland (not explicitly mapped) yields 'mixed'", () => {
    expect(climate.getClimateForBiome("grassland")).toBe("mixed");
  });

  it("empty string yields 'mixed' climate", () => {
    expect(climate.getClimateForBiome("")).toBe("mixed");
  });
});

// ---------------------------------------------------------------------------
// WeatherEffects
// ---------------------------------------------------------------------------
describe("WeatherEffects", () => {
  let effects: WeatherEffects;

  beforeEach(() => { effects = new WeatherEffects(); });

  it("fog applies 0.3 visibilityPenalty", () => {
    expect(effects.apply("fog").visibilityPenalty).toBeCloseTo(0.3);
  });

  it("fog has no movementPenalty", () => {
    expect(effects.apply("fog").movementPenalty).toBe(0);
  });

  it("storm applies 0.2 movementPenalty", () => {
    expect(effects.apply("storm").movementPenalty).toBeCloseTo(0.2);
  });

  it("storm has no visibilityPenalty", () => {
    expect(effects.apply("storm").visibilityPenalty).toBe(0);
  });

  it("clear weather has no penalties", () => {
    const result = effects.apply("clear");
    expect(result.visibilityPenalty).toBe(0);
    expect(result.movementPenalty).toBe(0);
  });

  it("rain has no penalties (not explicitly mapped)", () => {
    const result = effects.apply("rain");
    expect(result.visibilityPenalty).toBe(0);
    expect(result.movementPenalty).toBe(0);
  });

  it("unknown weather type returns zero penalties", () => {
    const result = effects.apply("hurricane");
    expect(result.visibilityPenalty).toBe(0);
    expect(result.movementPenalty).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// WeatherPresets
// ---------------------------------------------------------------------------
describe("WeatherPresets", () => {
  it("clear preset has full visibility and no movement penalty", () => {
    expect(WeatherPresets.clear.visibility).toBe(1);
    expect(WeatherPresets.clear.movePenalty).toBe(0);
  });

  it("rain preset has 0.9 visibility", () => {
    expect(WeatherPresets.rain.visibility).toBeCloseTo(0.9);
  });

  it("rain preset has 0.05 movePenalty", () => {
    expect(WeatherPresets.rain.movePenalty).toBeCloseTo(0.05);
  });

  it("storm preset has 0.7 visibility", () => {
    expect(WeatherPresets.storm.visibility).toBeCloseTo(0.7);
  });

  it("storm preset has 0.2 movePenalty (highest)", () => {
    expect(WeatherPresets.storm.movePenalty).toBeCloseTo(0.2);
  });

  it("fog preset has 0.6 visibility (lowest)", () => {
    expect(WeatherPresets.fog.visibility).toBeCloseTo(0.6);
  });

  it("snow preset has 0.8 visibility", () => {
    expect(WeatherPresets.snow.visibility).toBeCloseTo(0.8);
  });

  it("snow preset has 0.1 movePenalty", () => {
    expect(WeatherPresets.snow.movePenalty).toBeCloseTo(0.1);
  });

  it("all presets have visibility between 0 and 1", () => {
    for (const preset of Object.values(WeatherPresets)) {
      expect(preset.visibility).toBeGreaterThanOrEqual(0);
      expect(preset.visibility).toBeLessThanOrEqual(1);
    }
  });

  it("storm has the highest movePenalty of all presets", () => {
    const penalties = Object.values(WeatherPresets).map((p) => p.movePenalty);
    expect(WeatherPresets.storm.movePenalty).toBe(Math.max(...penalties));
  });

  it("fog has the lowest visibility of all presets", () => {
    const visibilities = Object.values(WeatherPresets).map((p) => p.visibility);
    expect(WeatherPresets.fog.visibility).toBe(Math.min(...visibilities));
  });
});
