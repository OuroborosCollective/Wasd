/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { GameplayWindowsLayer } from "./GameplayWindowsLayer";
import type { GameplayPanelId } from "./GameplayPanelRegistry";
import type { LiveGameplaySnapshot } from "../game/liveGameplaySnapshot";

describe("GameplayWindowsLayer UX & Accessibility", () => {
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

  const mockSnapshot: LiveGameplaySnapshot = {
    status: "live",
    serverTick: 1234,
    quests: [],
    skills: [],
    resources: [],
  };

  it("renders open window frames with accessible role='region', aria-label, and category icon", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const openPanels = new Set<GameplayPanelId>(["skills", "quests"]);
    const onClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameplayWindowsLayer
          snapshot={mockSnapshot}
          openPanels={openPanels}
          onClose={onClose}
        />
      );
    });

    // Check Skills window container
    const skillsWindow = container!.querySelector(
      '[data-testid="gameplay-window-skills"]'
    ) as HTMLElement;
    expect(skillsWindow).toBeTruthy();
    expect(skillsWindow.getAttribute("role")).toBe("region");
    expect(skillsWindow.getAttribute("aria-label")).toBe("Skills");

    // Check category icon in header
    const skillsHeader = skillsWindow.querySelector(".gameplay-window__header");
    expect(skillsHeader).toBeTruthy();
    const skillsIcon = skillsHeader?.querySelector("strong span[aria-hidden='true']");
    expect(skillsIcon).toBeTruthy();
    expect(skillsIcon?.textContent?.trim()).toBe("⭐");

    // Check close button accessibility attributes
    const closeBtn = skillsHeader?.querySelector(".gameplay-window__close") as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute("aria-label")).toBe("Close Skills [ESC]");
    expect(closeBtn.getAttribute("title")).toBe("Close Skills [ESC]");
    expect(closeBtn.getAttribute("aria-keyshortcuts")).toBe("Escape");

    // Check decorative kbd and ✕ are aria-hidden
    const kbd = closeBtn.querySelector("kbd");
    expect(kbd?.getAttribute("aria-hidden")).toBe("true");
    const closeSymbol = closeBtn.querySelector("span[aria-hidden='true']");
    expect(closeSymbol?.textContent?.trim()).toBe("✕");

    // Check Quests window container and icon
    const questsWindow = container!.querySelector(
      '[data-testid="gameplay-window-quests"]'
    ) as HTMLElement;
    expect(questsWindow).toBeTruthy();
    expect(questsWindow.getAttribute("role")).toBe("region");
    expect(questsWindow.getAttribute("aria-label")).toBe("Quest Journal");

    const questsIcon = questsWindow.querySelector("strong span[aria-hidden='true']");
    expect(questsIcon?.textContent?.trim()).toBe("📜");
  });

  it("calls onClose with panel id when close button is clicked", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const openPanels = new Set<GameplayPanelId>(["resources"]);
    const onClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <GameplayWindowsLayer
          snapshot={mockSnapshot}
          openPanels={openPanels}
          onClose={onClose}
        />
      );
    });

    const resourcesWindow = container!.querySelector(
      '[data-testid="gameplay-window-resources"]'
    );
    expect(resourcesWindow).toBeTruthy();

    const closeBtn = resourcesWindow?.querySelector(".gameplay-window__close") as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("resources");
  });
});
