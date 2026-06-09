import { describe, expect, it } from "vitest";
import {
  normalizeEquipmentStats,
  EMPTY_EQUIPMENT_STATS,
  type EquipmentStats,
} from "./liveGameplaySnapshot";

describe("normalizeEquipmentStats", () => {
  it("returns EMPTY_EQUIPMENT_STATS for null/undefined", () => {
    expect(normalizeEquipmentStats(null)).toEqual(EMPTY_EQUIPMENT_STATS);
    expect(normalizeEquipmentStats(undefined)).toEqual(EMPTY_EQUIPMENT_STATS);
  });

  it("returns EMPTY_EQUIPMENT_STATS for non-object input", () => {
    expect(normalizeEquipmentStats("not an object")).toEqual(EMPTY_EQUIPMENT_STATS);
    expect(normalizeEquipmentStats(42)).toEqual(EMPTY_EQUIPMENT_STATS);
    expect(normalizeEquipmentStats([])).toEqual(EMPTY_EQUIPMENT_STATS);
  });

  it("returns EMPTY_EQUIPMENT_STATS for empty object", () => {
    expect(normalizeEquipmentStats({})).toEqual(EMPTY_EQUIPMENT_STATS);
  });

  it("normalizes valid equipment stats", () => {
    const result = normalizeEquipmentStats({
      attackPower: 5,
      defense: 10,
      maxHealth: 100,
      maxStamina: 50,
      magicFind: 25,
      gatheringYield: 2,
      gatheringXp: 75,
      lootQuality: 15,
      criticalChancePerMille: 50,
    });

    expect(result.attackPower).toBe(5);
    expect(result.defense).toBe(10);
    expect(result.maxHealth).toBe(100);
    expect(result.maxStamina).toBe(50);
    expect(result.magicFind).toBe(25);
    expect(result.gatheringYield).toBe(2);
    expect(result.gatheringXp).toBe(75);
    expect(result.lootQuality).toBe(15);
    expect(result.criticalChancePerMille).toBe(50);
  });

  it("clamps negative values to 0", () => {
    const result = normalizeEquipmentStats({
      attackPower: -10,
      defense: -5,
      maxHealth: -100,
    });

    expect(result.attackPower).toBe(0);
    expect(result.defense).toBe(0);
    expect(result.maxHealth).toBe(0);
  });

  it("floors decimal values", () => {
    const result = normalizeEquipmentStats({
      attackPower: 5.9,
      defense: 10.1,
      magicFind: 3.7,
    });

    expect(result.attackPower).toBe(5);
    expect(result.defense).toBe(10);
    expect(result.magicFind).toBe(3);
  });

  it("ignores unknown fields", () => {
    const result = normalizeEquipmentStats({
      attackPower: 5,
      unknownField: 999,
      anotherBadField: "string",
    } as any);

    expect(result.attackPower).toBe(5);
    expect((result as any).unknownField).toBeUndefined();
  });

  it("uses 0 for missing fields", () => {
    const result = normalizeEquipmentStats({
      attackPower: 5,
    } as any);

    expect(result.attackPower).toBe(5);
    expect(result.defense).toBe(0);
    expect(result.maxHealth).toBe(0);
    expect(result.magicFind).toBe(0);
    expect(result.gatheringYield).toBe(0);
  });

  it("handles NaN and Infinity safely", () => {
    const result = normalizeEquipmentStats({
      attackPower: NaN,
      defense: Infinity,
      maxHealth: -Infinity,
      magicFind: 10,
    } as any);

    expect(result.attackPower).toBe(0);
    expect(result.defense).toBe(0);
    expect(result.maxHealth).toBe(0);
    expect(result.magicFind).toBe(10);
  });

  it("returns a new object every call (no mutation)", () => {
    const input = { attackPower: 5 };
    const result1 = normalizeEquipmentStats(input);
    const result2 = normalizeEquipmentStats(input);

    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});