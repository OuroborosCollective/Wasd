/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useGameplayPanels } from "./useGameplayPanels";

function TestComponent({ onOpenChange }: { onOpenChange: (ids: string[]) => void }) {
  const { openPanels, togglePanel } = useGameplayPanels();

  React.useEffect(() => {
    onOpenChange(Array.from(openPanels));
  }, [openPanels, onOpenChange]);

  return (
    <div>
      <button data-testid="toggle-character" onClick={() => togglePanel("character")}>
        Toggle Character
      </button>
      <button data-testid="toggle-inventory" onClick={() => togglePanel("inventory")}>
        Toggle Inventory
      </button>
      <button data-testid="toggle-quests" onClick={() => togglePanel("quests")}>
        Toggle Quests
      </button>
    </div>
  );
}

describe("useGameplayPanels UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("opens panels and closes them with Escape key", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    let activePanels: string[] = [];

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <TestComponent onOpenChange={(ids) => { activePanels = ids; }} />
      );
    });

    // Toggle character off (since it is default open)
    const toggleCharBtn = container!.querySelector('[data-testid="toggle-character"]') as HTMLButtonElement;
    await act(async () => {
      toggleCharBtn.click();
    });
    expect(activePanels).not.toContain("character");
    expect(activePanels.length).toBe(0);

    // Toggle inventory
    const toggleInvBtn = container!.querySelector('[data-testid="toggle-inventory"]') as HTMLButtonElement;
    await act(async () => {
      toggleInvBtn.click();
    });
    expect(activePanels).toContain("inventory");

    // Toggle quests
    const toggleQuestsBtn = container!.querySelector('[data-testid="toggle-quests"]') as HTMLButtonElement;
    await act(async () => {
      toggleQuestsBtn.click();
    });
    expect(activePanels).toContain("inventory");
    expect(activePanels).toContain("quests");
    expect(activePanels.length).toBe(2);

    // Pressing a non-Escape key doesn't close them
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    expect(activePanels.length).toBe(2);

    // Press Escape key
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(activePanels.length).toBe(0);
  });
});
