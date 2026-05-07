/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NewHud } from "./NewHud";

// Mock the state and networking modules
vi.mock("../../state/playerState", () => ({
  subscribePlayerState: vi.fn(() => () => {}),
  getPlayerHealth: () => 80,
  getPlayerMaxHealth: () => 100,
  getPlayerMana: () => 30,
  getPlayerMaxMana: () => 50,
  getPlayerXp: () => 1200,
  getPlayerLevel: () => 2,
  getPlayerGold: () => 0,
  getPlayerInventory: () => [],
  getPlayerInventoryWeight: () => 0,
  getPlayerMaxCarryWeight: () => 100,
  getPlayerQuests: () => [],
  getCombatTargetNpcId: () => null,
}));

vi.mock("../useGameHudState", () => ({
  useGameHudState: () => ({
    warfront: null,
    activeQuests: [],
    nearbyLoot: [],
    inventoryOpen: false,
    toggleInventory: vi.fn(),
  }),
}));

vi.mock("../touchUi", () => ({
  getDeviceTier: () => "desktop"
}));

describe("NewHud Micro-UX Enhancements", () => {
  it("renders health/mana values from player state", () => {
    render(<NewHud />);

    const barTexts = document.querySelectorAll(".hud-bar-text");
    expect(barTexts[0]?.textContent).toContain("80");
    expect(barTexts[0]?.textContent).toContain("100");
    expect(barTexts[1]?.textContent).toContain("30");
    expect(barTexts[1]?.textContent).toContain("50");
    expect(document.querySelector(".hud-level-badge")?.textContent).toBe("2");
  });
});
