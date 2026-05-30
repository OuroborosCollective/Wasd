import { describe, it, expect } from "vitest";
import { WeatherMonsterBridge } from "../modules/monster/WeatherMonsterBridge.js";
import { type MutatedMonster } from "../modules/monster/MonsterMutation.js";

describe("WeatherMonsterBridge", () => {
  const createBaseMonster = (): MutatedMonster => ({
    species: "goblin",
    strength: 0.5,
    speed: 0.5,
    aggression: 0.5,
    intelligence: 0.5,
    resilience: 0.5,
    mutations: []
  });

  it("applies storm modifiers correctly", () => {
    const monster = createBaseMonster();
    WeatherMonsterBridge.applyWeatherModifiers(monster, "storm");
    expect(monster.aggression).toBeCloseTo(0.7);
    expect(monster.strength).toBeCloseTo(0.6);
    expect(monster.mutations).toContain("storm_frenzy");
  });

  it("applies fog modifiers correctly", () => {
    const monster = createBaseMonster();
    WeatherMonsterBridge.applyWeatherModifiers(monster, "fog");
    expect(monster.speed).toBeCloseTo(0.65);
    expect(monster.intelligence).toBeCloseTo(0.6);
    expect(monster.mutations).toContain("mist_stalker");
  });

  it("is deterministic (same input produces same output)", () => {
    const monster1 = createBaseMonster();
    const monster2 = createBaseMonster();
    WeatherMonsterBridge.applyWeatherModifiers(monster1, "snow");
    WeatherMonsterBridge.applyWeatherModifiers(monster2, "snow");
    expect(monster1).toEqual(monster2);
    expect(monster1.resilience).toBeCloseTo(0.65);
    expect(monster1.speed).toBeCloseTo(0.4);
    expect(monster1.mutations).toContain("frost_touched");
  });

  it("does nothing for unknown weather", () => {
    const monster = createBaseMonster();
    const original = { ...monster, mutations: [...monster.mutations] };
    WeatherMonsterBridge.applyWeatherModifiers(monster, "unknown");
    expect(monster).toEqual(original);
  });
});
