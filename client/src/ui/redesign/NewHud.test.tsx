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

vi.mock("../touchUi", () => ({
  getDeviceTier: () => "desktop"
}));

describe("NewHud Accessibility", () => {
  const defaultProps = {
    connected: true,
    youId: "player1",
    entities: [],
    loot: [],
    inv: {},
    quests: [],
    targetId: undefined,
    onTarget: vi.fn(),
    onAttack: vi.fn(),
    onLootTake: vi.fn(),
    onCraftOpen: vi.fn(),
    onHousingOpen: vi.fn(),
    fxFeed: [],
    warfront: null,
    onMenuOpen: vi.fn(),
  };

  it("renders with correct ARIA roles and labels", () => {
    render(<NewHud {...defaultProps} />);

    // Chat preview role log and live region
    const chatPreview = screen.getByRole("log");
    expect(chatPreview).toBeTruthy();
    expect(chatPreview.getAttribute("aria-live")).toBe("polite");

    // Chat input label
    const chatInput = screen.getByLabelText("Chat message");
    expect(chatInput).toBeTruthy();

    // Side menu buttons
    expect(screen.getByLabelText("Open Inventory")).toBeTruthy();
    expect(screen.getByLabelText("Open Skills")).toBeTruthy();
    expect(screen.getByLabelText("Open Equipment")).toBeTruthy();
    expect(screen.getByLabelText("Open Mastery")).toBeTruthy();

    // Skill slots
    expect(screen.getByLabelText("Use Frost Shard")).toBeTruthy();
    expect(screen.getByLabelText("Use Arc Spark")).toBeTruthy();
    expect(screen.getByLabelText("Use Vitality Tap")).toBeTruthy();
    expect(screen.getByLabelText("Use Ember Bolt")).toBeTruthy();
    expect(screen.getByLabelText("Use Shadow Tag")).toBeTruthy();
    expect(screen.getByLabelText("Use Aether Pulse")).toBeTruthy();

    // Attack orb
    const attackOrb = screen.getByLabelText("Attack");
    expect(attackOrb).toBeTruthy();
    expect(attackOrb.getAttribute("role")).toBe("button");
    expect(attackOrb.getAttribute("tabIndex")).toBe("0");
  });
});
