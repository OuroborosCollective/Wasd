/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NpcContextWindow } from "./NpcContextWindow";
import type { NpcInfo, DialogueState, QuestPreview } from "./NpcUI.types";

describe("NpcContextWindow UX & Accessibility", () => {
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

  const mockNpc: NpcInfo = {
    id: "npc_eloria",
    name: "Eloria the Wise",
    role: "elder",
    faction: "Areloria",
  };

  const mockDialogue: DialogueState = {
    currentText: "Greetings, traveler of Areloria. Seek wisdom in ancient halls.",
    canContinue: true,
    isFinished: false,
  };

  const mockQuest: QuestPreview = {
    name: "Whispers in the Gloom",
    description: "Investigate unusual sounds near the ancient grove.",
    objective: "Gather 3 luminous moss samples.",
    reward: "500 XP, Silver Amulet",
    isNew: true,
  };

  it("renders with modal dialog semantics, accessible labels, and category icons", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();
    const onAction = vi.fn();
    const onContinue = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={mockDialogue}
          quest={mockQuest}
          onClose={onClose}
          onAction={onAction}
          onContinue={onContinue}
        />
      );
    });

    const dialog = container!.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("npc-dialogue-title");

    const title = container!.querySelector("#npc-dialogue-title");
    expect(title).toBeTruthy();
    expect(title?.textContent).toBe("Eloria the Wise");

    const closeBtn = container!.querySelector('button[aria-label="Close dialogue [ESC]"]');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute("aria-keyshortcuts")).toBe("Escape");
    expect(closeBtn?.getAttribute("title")).toBe("Close Eloria the Wise dialogue [ESC]");

    const roleTag = container!.textContent;
    expect(roleTag).toContain("elder");
    expect(roleTag).toContain("Areloria");

    // Check quest information renders
    expect(container!.textContent).toContain("Whispers in the Gloom");
    expect(container!.textContent).toContain("Gather 3 luminous moss samples.");
    expect(container!.textContent).toContain("500 XP, Silver Amulet");
  });

  it("handles close button click and Escape key dismissal", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();
    const onAction = vi.fn();
    const onContinue = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={mockDialogue}
          quest={mockQuest}
          onClose={onClose}
          onAction={onAction}
          onContinue={onContinue}
        />
      );
    });

    const closeBtn = container!.querySelector('button[aria-label="Close dialogue [ESC]"]') as HTMLButtonElement;
    await act(async () => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("triggers onContinue when Continue button is clicked or Space key is pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();
    const onAction = vi.fn();
    const onContinue = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={mockDialogue}
          quest={null}
          onClose={onClose}
          onAction={onAction}
          onContinue={onContinue}
        />
      );
    });

    const continueBtn = container!.querySelector('button[aria-label="Continue dialogue [Space/Enter/E]"]') as HTMLButtonElement;
    expect(continueBtn).toBeTruthy();

    await act(async () => {
      continueBtn.click();
    });
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    });
    expect(onContinue).toHaveBeenCalledTimes(2);
  });
});
