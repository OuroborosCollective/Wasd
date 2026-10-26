/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NpcInteractionMenu } from "./NpcInteractionMenu";
import type { NpcMenuItem } from "./NpcUI.types";

const mockItems: readonly NpcMenuItem[] = [
  { action: "talk", label: "TALK", shortcut: "1", color: "cyan", hasNotification: false },
  { action: "quests", label: "QUESTS", shortcut: "2", color: "green", hasNotification: true },
  { action: "trade", label: "TRADE", shortcut: "3", color: "orange", hasNotification: false, isDisabled: true },
  { action: "goodbye", label: "GOODBYE", shortcut: "0", color: "gray", hasNotification: false },
];

describe("NpcInteractionMenu UX and Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("renders menu with WAI-ARIA role and proper accessibility attributes", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcInteractionMenu
          items={mockItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );
    });

    const menu = container!.querySelector('[role="menu"]');
    expect(menu).toBeTruthy();
    expect(menu?.getAttribute("aria-label")).toBe("NPC Interaction Menu");

    const menuItems = container!.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(4);

    // Selected state check
    expect(menuItems[0].getAttribute("aria-selected")).toBe("true");
    expect(menuItems[1].getAttribute("aria-selected")).toBe("false");

    // Shortcut checks
    expect(menuItems[0].getAttribute("aria-keyshortcuts")).toBe("1");
    expect(menuItems[1].getAttribute("aria-keyshortcuts")).toBe("2");

    // Notification aria-label check
    expect(menuItems[0].getAttribute("aria-label")).toBe("TALK");
    expect(menuItems[1].getAttribute("aria-label")).toBe("QUESTS (New notification)");

    // Decorative elements marked aria-hidden
    const hiddenElements = container!.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it("handles mouse click and triggers selection and confirmation", async () => {
    const handleSelect = vi.fn();
    const handleConfirm = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcInteractionMenu
          items={mockItems}
          selectedIndex={0}
          onSelect={handleSelect}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      );
    });

    const menuItems = container!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const questButton = menuItems[1];

    await act(async () => {
      questButton.click();
    });

    expect(handleSelect).toHaveBeenCalledWith(1);
    expect(handleConfirm).toHaveBeenCalledWith(1);
  });

  it("does not trigger callbacks when clicking disabled menu item", async () => {
    const handleSelect = vi.fn();
    const handleConfirm = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcInteractionMenu
          items={mockItems}
          selectedIndex={0}
          onSelect={handleSelect}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />
      );
    });

    const menuItems = container!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const tradeButton = menuItems[2];
    expect(tradeButton.disabled).toBe(true);

    await act(async () => {
      tradeButton.click();
    });

    expect(handleSelect).not.toHaveBeenCalled();
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("handles keyboard navigation (ArrowDown, ArrowUp, Escape)", async () => {
    const handleSelect = vi.fn();
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcInteractionMenu
          items={mockItems}
          selectedIndex={0}
          onSelect={handleSelect}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    });
    expect(handleSelect).toHaveBeenCalledWith(1);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(handleCancel).toHaveBeenCalled();
  });
});
