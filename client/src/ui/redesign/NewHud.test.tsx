/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NewHud } from "./NewHud";

// Mock the state and networking modules
vi.mock("../../state/playerState", () => ({
  subscribePlayerState: vi.fn(() => () => {}),
  getPlayerHealth: () => 100,
  getPlayerMaxHealth: () => 100,
  getPlayerMana: () => 50,
  getPlayerMaxMana: () => 50,
  getPlayerXp: () => 100,
  getPlayerLevel: () => 1,
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

describe("NewHud Accessibility", () => {
  it("renders core HUD structure and action bar", () => {
    render(<NewHud />);

    expect(document.querySelector(".new-hud-container")).toBeTruthy();
    expect(document.querySelector(".hud-level-badge")?.textContent).toBe("1");

    const barTexts = document.querySelectorAll(".hud-bar-text");
    expect(barTexts).toHaveLength(2);
    expect(barTexts[0]?.textContent).toMatch(/100/);
    expect(barTexts[1]?.textContent).toMatch(/50/);

    for (const key of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByText(key, { selector: ".skill-key" })).toBeTruthy();
    }
  });
});
