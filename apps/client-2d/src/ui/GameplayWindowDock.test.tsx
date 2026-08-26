/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GameplayWindowDock } from "./GameplayWindowDock";
import type { GameplayPanelId } from "./GameplayPanelRegistry";

describe("GameplayWindowDock UX & Accessibility", () => {
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

  it("renders dock with proper panel buttons, shortcuts, and aria-labels", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const openPanels = new Set<GameplayPanelId>(["character"]);
    const onToggle = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameplayWindowDock openPanels={openPanels} onToggle={onToggle} />
      );
    });

    // Verify dock has correct class and role/label if any
    const nav = container!.querySelector('[data-testid="gameplay-window-dock"]');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute("aria-label")).toBe("Gameplay windows");

    // Verify "Character" panel is active (aria-pressed=true) and has correct a11y tags
    const charBtn = container!.querySelector('[data-testid="panel-toggle-character"]');
    expect(charBtn).toBeTruthy();
    expect(charBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(charBtn?.getAttribute("aria-label")).toBe("Character Panel [P]");
    expect(charBtn?.getAttribute("aria-keyshortcuts")).toBe("p");

    // Verify visual kbd is hidden from screen readers
    const kbd = charBtn?.querySelector("kbd");
    expect(kbd).toBeTruthy();
    expect(kbd?.getAttribute("aria-hidden")).toBe("true");

    // Verify "Skills" panel is inactive (aria-pressed=false) and has correct a11y tags
    const skillsBtn = container!.querySelector('[data-testid="panel-toggle-skills"]');
    expect(skillsBtn).toBeTruthy();
    expect(skillsBtn?.getAttribute("aria-pressed")).toBe("false");
    expect(skillsBtn?.getAttribute("aria-label")).toBe("Skills Panel [K]");
    expect(skillsBtn?.getAttribute("aria-keyshortcuts")).toBe("k");
  });

  it("triggers onToggle when button is clicked", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const openPanels = new Set<GameplayPanelId>();
    const onToggle = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameplayWindowDock openPanels={openPanels} onToggle={onToggle} />
      );
    });

    const questsBtn = container!.querySelector('[data-testid="panel-toggle-quests"]') as HTMLButtonElement;
    expect(questsBtn).toBeTruthy();

    await act(async () => {
      questsBtn.click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("quests");
  });
});
