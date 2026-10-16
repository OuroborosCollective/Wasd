/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NpcContextWindow } from "./NpcContextWindow";
import type { NPCData, DialogueState, QuestPreview } from "./NpcUI.types";

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

  const mockNpc: NPCData = {
    id: "alchemist_01",
    name: "Alchemist Elara",
    role: "Apothecary",
    faction: "Order of Tides",
  };

  const mockDialogue: DialogueState = {
    currentText: "Welcome traveler. I have concoctions for any plight.",
    canContinue: true,
    isFinished: false,
  };

  const mockQuest: QuestPreview = {
    id: "quest_herbs_01",
    name: "Gather Silverleaf",
    objective: "Collect 5 Silverleaf herbs from the valley.",
    reward: "100 Gold, Minor Health Potion",
    isNew: true,
  };

  it("does not render when isOpen is false", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={false}
          npc={mockNpc}
          dialogue={mockDialogue}
          onClose={vi.fn()}
          onAction={vi.fn()}
        />
      );
    });

    const dialog = container!.querySelector("[role='dialog']");
    expect(dialog).toBeNull();
  });

  it("renders modal dialog container with proper ARIA attributes when open", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={mockDialogue}
          quest={mockQuest}
          onClose={onClose}
          onAction={vi.fn()}
          onContinue={vi.fn()}
        />
      );
    });

    const dialog = container!.querySelector("[role='dialog']");
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("npc-context-title");

    const titleEl = container!.querySelector("#npc-context-title");
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent).toContain("Alchemist Elara");

    const closeBtn = container!.querySelector("button[aria-label='Close dialogue [ESC]']") as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute("title")).toBe("Close dialogue [ESC]");
    expect(closeBtn.getAttribute("aria-keyshortcuts")).toBe("Escape");

    await act(async () => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders dialogue continue button with keyboard shortcuts and title tooltip", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onContinue = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={mockDialogue}
          onClose={vi.fn()}
          onAction={vi.fn()}
          onContinue={onContinue}
        />
      );
    });

    const continueBtn = container!.querySelector("button[aria-label='Continue dialogue [Space/Enter/E]']") as HTMLButtonElement;
    expect(continueBtn).toBeTruthy();
    expect(continueBtn.getAttribute("title")).toBe("Continue dialogue [Space/Enter/E]");
    expect(continueBtn.getAttribute("aria-keyshortcuts")).toBe("Space Enter e");

    await act(async () => {
      continueBtn.click();
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders finished dialogue status with role='status'", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const finishedDialogue: DialogueState = {
      currentText: "May your path be clear.",
      canContinue: false,
      isFinished: true,
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcContextWindow
          isOpen={true}
          npc={mockNpc}
          dialogue={finishedDialogue}
          onClose={vi.fn()}
          onAction={vi.fn()}
        />
      );
    });

    const statusEl = container!.querySelector("[role='status']");
    expect(statusEl).toBeTruthy();
    expect(statusEl?.textContent).toContain("Dialogue Complete");
  });
});
