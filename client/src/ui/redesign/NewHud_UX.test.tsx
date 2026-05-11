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

vi.mock("../touchUi", () => ({
  getDeviceTier: () => "desktop"
}));

describe("NewHud Micro-UX Enhancements", () => {
  const defaultProps = {
    connected: true,
    youId: "player1",
    entities: [
        { id: "target-1", name: "Orc", hp: 50, hpMax: 100, kind: "monster" as const, x: 0, y: 0, level: 1 }
    ],
    loot: [],
    inv: {},
    quests: [],
    targetId: "target-1",
    onTarget: vi.fn(),
    onAttack: vi.fn(),
    onLootTake: vi.fn(),
    onCraftOpen: vi.fn(),
    onHousingOpen: vi.fn(),
    fxFeed: [],
    warfront: null,
    onMenuOpen: vi.fn(),
  };

  it("renders status indicators with correct ARIA attributes and titles", () => {
    render(<NewHud {...defaultProps} />);

    // HP Progressbar
    const hp = screen.getByLabelText("Health");
    expect(hp.getAttribute("role")).toBe("progressbar");
    expect(hp.getAttribute("aria-valuenow")).toBe("80");
    expect(hp.getAttribute("aria-valuemax")).toBe("100");
    expect(hp.getAttribute("title")).toBe("Health: 80 / 100");

    // MP Progressbar
    const mp = screen.getByLabelText("Mana");
    expect(mp.getAttribute("role")).toBe("progressbar");
    expect(mp.getAttribute("aria-valuenow")).toBe("30");
    expect(mp.getAttribute("aria-valuemax")).toBe("50");
    expect(mp.getAttribute("title")).toBe("Mana: 30 / 50");

    // XP Progressbar
    const xp = screen.getByLabelText("Experience");
    expect(xp.getAttribute("role")).toBe("progressbar");
    expect(xp.getAttribute("aria-valuenow")).toBe("200"); // 1200 % 1000
    expect(xp.getAttribute("aria-valuemax")).toBe("1000");
    expect(xp.getAttribute("title")).toBe("XP: 200 / 1000");

    // Target HP Progressbar
    const targetHp = screen.getByLabelText("Target Health: Orc");
    expect(targetHp.getAttribute("role")).toBe("progressbar");
    expect(targetHp.getAttribute("aria-valuenow")).toBe("50");
    expect(targetHp.getAttribute("aria-valuemax")).toBe("100");
    expect(targetHp.getAttribute("title")).toBe("Target Health: 50 / 100");
  });
});
