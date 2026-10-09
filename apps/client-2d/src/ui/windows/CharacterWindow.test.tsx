/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CharacterWindow, characterWindowStore, type PlayerStatsSnapshot } from "./CharacterWindow";

describe("CharacterWindow UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    characterWindowStore.clear();
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("renders dialog container with header close button, aria-modal, aria-labelledby, and shortcut hint", async () => {
    const handleClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterWindow isOpen={true} onClose={handleClose} />);
    });

    const dialog = container!.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("character-window-title");

    const headerTitle = container!.querySelector("#character-window-title");
    expect(headerTitle).toBeTruthy();
    expect(headerTitle?.textContent).toBe("CHARACTER");

    const closeBtn = container!.querySelector(".wow-close-btn");
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute("aria-label")).toBe("Close [ESC]");
    expect(closeBtn?.getAttribute("title")).toBe("Close [ESC]");
    expect(closeBtn?.getAttribute("aria-keyshortcuts")).toBe("Escape");
  });

  it("triggers onClose when pressing Escape key", async () => {
    const handleClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterWindow isOpen={true} onClose={handleClose} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders progress bars with WAI-ARIA attributes, aria-valuetext, and title tooltips", async () => {
    const mockSnapshot: PlayerStatsSnapshot = {
      playerId: "p1",
      level: 5,
      totalLevel: 15,
      unspentStatPoints: 2,
      hp: 80,
      maxHp: 100,
      mana: 40,
      maxMana: 50,
      stamina: 90,
      maxStamina: 100,
      gold: 250,
      coreStats: {
        strength: 12,
        agility: 10,
        intelligence: 8,
      },
      skills: {
        mining: { xp: 100, level: 2, nextLevelXP: 200, progressPercent: 50 },
        woodcutting: { xp: 150, level: 3, nextLevelXP: 300, progressPercent: 75 },
      },
    };

    characterWindowStore.receiveSnapshot(mockSnapshot);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterWindow isOpen={true} />);
    });

    const progressBars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(4); // Average skill progress, HP, Mana, Stamina

    const hpBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-label") === "HP"
    );
    expect(hpBar).toBeTruthy();
    expect(hpBar?.getAttribute("aria-valuenow")).toBe("80");
    expect(hpBar?.getAttribute("aria-valuetext")).toBe("HP: 80 / 100");
    expect(hpBar?.getAttribute("title")).toBe("HP: 80 / 100");

    const skillProgressBar = Array.from(progressBars).find(
      (bar) => bar.getAttribute("aria-label") === "Average Skill Progress"
    );
    expect(skillProgressBar).toBeTruthy();
    expect(skillProgressBar?.getAttribute("aria-valuenow")).toBe("62");
    expect(skillProgressBar?.getAttribute("aria-valuetext")).toBe("Average Skill Progress: 63%");
    expect(skillProgressBar?.getAttribute("title")).toBe("Average Skill Progress: 63%");
  });

  it("applies animate-pulse to stat bar when current value is under 20% max", async () => {
    const mockLowHpSnapshot: PlayerStatsSnapshot = {
      playerId: "p1",
      level: 5,
      totalLevel: 15,
      unspentStatPoints: 0,
      hp: 15, // 15% HP -> Low vital threshold (<20%)
      maxHp: 100,
      mana: 40,
      maxMana: 50,
      stamina: 80,
      maxStamina: 100,
      gold: 100,
      coreStats: {
        strength: 10,
        agility: 10,
        intelligence: 10,
      },
      skills: {},
    };

    characterWindowStore.receiveSnapshot(mockLowHpSnapshot);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CharacterWindow isOpen={true} />);
    });

    const hpBarTrack = Array.from(container!.querySelectorAll('[role="progressbar"]')).find(
      (bar) => bar.getAttribute("aria-label") === "HP"
    );
    expect(hpBarTrack).toBeTruthy();

    const fillElement = hpBarTrack?.querySelector(".char-bar-fill");
    expect(fillElement).toBeTruthy();
    expect(fillElement?.classList.contains("animate-pulse")).toBe(true);

    const manaBarTrack = Array.from(container!.querySelectorAll('[role="progressbar"]')).find(
      (bar) => bar.getAttribute("aria-label") === "Mana"
    );
    const manaFillElement = manaBarTrack?.querySelector(".char-bar-fill");
    expect(manaFillElement?.classList.contains("animate-pulse")).toBe(false);
  });
});
