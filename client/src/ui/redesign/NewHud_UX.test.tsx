/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NewHud } from "./NewHud";
import { sendCommand } from "../../networking/websocketClient";

// Mock the state and networking modules
vi.mock("../../state/playerState", () => ({
  subscribePlayerState: vi.fn(() => () => {}),
  getPlayerHealth: vi.fn(() => 80),
  getPlayerMaxHealth: vi.fn(() => 100),
  getPlayerMana: vi.fn(() => 30),
  getPlayerMaxMana: vi.fn(() => 50),
  getPlayerXp: vi.fn(() => 1200),
  getPlayerLevel: vi.fn(() => 2),
  getPlayerGold: vi.fn(() => 0),
  getPlayerInventory: vi.fn(() => []),
  getPlayerInventoryWeight: vi.fn(() => 0),
  getPlayerMaxCarryWeight: vi.fn(() => 100),
  getPlayerQuests: vi.fn(() => []),
  getCombatTargetNpcId: vi.fn(() => null),
}));

vi.mock("../../networking/websocketClient", () => ({
  sendCommand: vi.fn(),
  sendUseSkill: vi.fn(),
}));

import * as playerState from "../../state/playerState";

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
    expect(hp.getAttribute("aria-valuetext")).toBe("80 of 100 health remaining");
    expect(hp.getAttribute("title")).toBe("Health: 80 / 100");

    // MP Progressbar
    const mp = screen.getByLabelText("Mana");
    expect(mp.getAttribute("role")).toBe("progressbar");
    expect(mp.getAttribute("aria-valuenow")).toBe("30");
    expect(mp.getAttribute("aria-valuemax")).toBe("50");
    expect(mp.getAttribute("aria-valuetext")).toBe("30 of 50 mana remaining");
    expect(mp.getAttribute("title")).toBe("Mana: 30 / 50");

    // XP Progressbar
    const xp = screen.getByLabelText("Experience");
    expect(xp.getAttribute("role")).toBe("progressbar");
    expect(xp.getAttribute("aria-valuenow")).toBe("200"); // 1200 % 1000
    expect(xp.getAttribute("aria-valuemax")).toBe("1000");
    expect(xp.getAttribute("aria-valuetext")).toBe("200 out of 1000 experience points to next level");
    expect(xp.getAttribute("title")).toBe("XP: 200 / 1000");

    // Target HP Progressbar
    const targetHp = screen.getByLabelText("Target Health: Orc");
    expect(targetHp.getAttribute("role")).toBe("progressbar");
    expect(targetHp.getAttribute("aria-valuenow")).toBe("50");
    expect(targetHp.getAttribute("aria-valuemax")).toBe("100");
    expect(targetHp.getAttribute("title")).toBe("Target Health: 50 / 100");
  });

  it("applies low-health class when HP is below 25%", () => {
    vi.mocked(playerState.getPlayerHealth).mockReturnValue(10);
    render(<NewHud {...defaultProps} />);
    const hpBars = screen.getAllByLabelText("Health");
    const hpBar = hpBars[hpBars.length - 1];
    expect(hpBar.className).toContain("low-health");
  });

  it("uses semantic <kbd> tags for skill slot keys", () => {
    render(<NewHud {...defaultProps} />);
    const kbd = screen.getAllByText("1")[0]; // Find slot 1 key hint
    expect(kbd.tagName.toLowerCase()).toBe("kbd");
    expect(kbd.className).toBe("skill-key");
  });

  it('should not trigger looting if Ctrl key is pressed', () => {
    const loot = [{ id: '1', itemId: 'gold', quantity: 1, x: 0, y: 0 }];
    render(<NewHud loot={loot} />);

    const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
    window.dispatchEvent(event);

    expect(sendCommand).not.toHaveBeenCalledWith('loot_all');
  });

  it('should not trigger looting if Meta key is pressed', () => {
    const loot = [{ id: '1', itemId: 'gold', quantity: 1, x: 0, y: 0 }];
    render(<NewHud loot={loot} />);

    const event = new KeyboardEvent('keydown', { key: 'f', metaKey: true });
    window.dispatchEvent(event);

    expect(sendCommand).not.toHaveBeenCalledWith('loot_all');
  });
});
