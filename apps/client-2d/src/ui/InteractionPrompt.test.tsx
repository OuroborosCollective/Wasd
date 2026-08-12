/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { InteractionPrompt } from "./InteractionPrompt";
import type { InteractionTarget } from "../game/interactions";

describe("InteractionPrompt UX & Accessibility", () => {
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

  it("returns null when target is null", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InteractionPrompt target={null} onInteract={() => {}} />);
    });

    expect(container!.children.length).toBe(0);
    expect(container!.textContent).toBe("");
  });

  it("renders interaction prompt with proper ARIA and keyshortcuts when target is provided", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockTarget: InteractionTarget = {
      entityId: "npc-chest-1",
      kind: "npc",
      label: "Talk to Chest",
      distance: 1.2,
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InteractionPrompt target={mockTarget} onInteract={() => {}} />);
    });

    // The button should render and contain target.label
    const button = container!.querySelector("button");
    expect(button).toBeTruthy();
    expect(button!.textContent).toContain("Talk to Chest");

    // The button must have correct aria attributes for high-fidelity micro-UX and accessibility
    expect(button!.getAttribute("aria-label")).toBe("Interact with Talk to Chest");
    expect(button!.getAttribute("aria-keyshortcuts")).toBe("e");

    // Must render the <kbd> visual element to prompt the player with keybind hint
    const kbd = container!.querySelector("kbd");
    expect(kbd).toBeTruthy();
    expect(kbd!.textContent?.trim()).toBe("E");
  });

  it("calls onInteract when the interaction button is clicked", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockTarget: InteractionTarget = {
      entityId: "npc-villager-2",
      kind: "npc",
      label: "Talk to Eldrin",
      distance: 0.5,
    };

    const handleInteract = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InteractionPrompt target={mockTarget} onInteract={handleInteract} />);
    });

    const button = container!.querySelector("button");
    expect(button).toBeTruthy();

    await act(async () => {
      button!.click();
    });

    expect(handleInteract).toHaveBeenCalledTimes(1);
  });
});
