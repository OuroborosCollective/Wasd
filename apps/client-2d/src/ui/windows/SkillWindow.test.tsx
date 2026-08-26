/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SkillWindow, characterWindowStore, type PlayerStatsSnapshot } from "./SkillWindow";

vi.mock("../dnd/DnDContext", () => ({
  DnDProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./EquipmentPanel", () => ({
  EquipmentPanel: () => <div data-testid="equipment-panel">Mock Equipment Panel</div>,
}));

describe("SkillWindow UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  const mockSnapshot: PlayerStatsSnapshot = {
    playerId: "player-1",
    skills: {
      combat: { xp: 50, level: 5, nextLevelXP: 100, progressPercent: 50 }
    },
    coreStats: {
      strength: 12,
      agility: 15,
      intelligence: 10
    },
    unspentStatPoints: 3,
    totalLevel: 10,
    hp: 15,          // 15/100 = 15% -> HP bar should pulse!
    maxHp: 100,
    mana: 80,
    maxMana: 100,
    stamina: 50,     // 50/100 = 50% -> Stamina bar should NOT pulse.
    maxStamina: 100,
    gold: 350,
    level: 10,
  };

  it("renders layout successfully with character level, gold, and attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      characterWindowStore.receiveSnapshot(mockSnapshot);
    });

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillWindow isOpen={true} onClose={() => {}} />);
    });

    expect(container!.textContent).toContain("SKILLS");
    expect(container!.textContent).toContain("Level");
    expect(container!.textContent).toContain("10");
    expect(container!.textContent).toContain("350 Gold");
    expect(container!.textContent).toContain("STR");
    expect(container!.textContent).toContain("12");
  });

  it("triggers onClose callback when Escape key is pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onCloseMock = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillWindow isOpen={true} onClose={onCloseMock} />);
    });

    // Fire the Escape keydown event on window
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("configures vitals progress bars with proper ARIA progressbar roles and attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      characterWindowStore.receiveSnapshot(mockSnapshot);
    });

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillWindow isOpen={true} onClose={() => {}} />);
    });

    const progressbars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressbars.length).toBeGreaterThanOrEqual(4); // HP, Mana, Stamina, XP

    // Verify HP Progressbar
    const hpBar = Array.from(progressbars).find(bar => bar.getAttribute("aria-label") === "HP");
    expect(hpBar).toBeTruthy();
    expect(hpBar!.getAttribute("aria-valuemin")).toBe("0");
    expect(hpBar!.getAttribute("aria-valuemax")).toBe("100");
    expect(hpBar!.getAttribute("aria-valuenow")).toBe("15");
    expect(hpBar!.getAttribute("aria-valuetext")).toBe("15%");
    expect(hpBar!.getAttribute("title")).toBe("HP: 15 / 100 (15%)");

    // Verify Stamina Progressbar
    const staminaBar = Array.from(progressbars).find(bar => bar.getAttribute("aria-label") === "Stamina");
    expect(staminaBar).toBeTruthy();
    expect(staminaBar!.getAttribute("aria-valuemin")).toBe("0");
    expect(staminaBar!.getAttribute("aria-valuemax")).toBe("100");
    expect(staminaBar!.getAttribute("aria-valuenow")).toBe("50");
    expect(staminaBar!.getAttribute("aria-valuetext")).toBe("50%");
    expect(staminaBar!.getAttribute("title")).toBe("Stamina: 50 / 100 (50%)");
  });

  it("applies animate-pulse styling when vitals (HP) are critically low (<20%)", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      characterWindowStore.receiveSnapshot(mockSnapshot);
    });

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillWindow isOpen={true} onClose={() => {}} />);
    });

    const progressbars = container!.querySelectorAll('[role="progressbar"]');

    // HP is 15% -> should have animate-pulse
    const hpBar = Array.from(progressbars).find(bar => bar.getAttribute("aria-label") === "HP") as HTMLElement;
    const hpFill = hpBar.querySelector(".char-bar-fill")!;
    expect(hpFill.className).toContain("animate-pulse");

    // Stamina is 50% -> should NOT have animate-pulse
    const staminaBar = Array.from(progressbars).find(bar => bar.getAttribute("aria-label") === "Stamina") as HTMLElement;
    const staminaFill = staminaBar.querySelector(".char-bar-fill")!;
    expect(staminaFill.className).not.toContain("animate-pulse");
  });
});
