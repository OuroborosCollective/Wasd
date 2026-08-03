/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ResourceNodePanel } from "./ResourceNodePanel";
import type { ResourceNodeSnapshot } from "../../game/liveGameplaySnapshot";

describe("ResourceNodePanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    // Set flag to let React know this is an act-supported testing environment
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  const mockResources: ResourceNodeSnapshot[] = [
    {
      id: "node-tree-1",
      kind: "tree",
      title: "Ancient Oak",
      status: "available",
      xpReward: 25,
      itemRewardId: "oak_log",
      itemRewardName: "Oak Log",
      remainingTicks: 0,
      position: { x: 10, y: 12 },
    },
    {
      id: "node-ore-1",
      kind: "ore",
      title: "Copper Vein",
      status: "depleted",
      xpReward: 15,
      itemRewardId: "copper_ore",
      itemRewardName: "Copper Ore",
      remainingTicks: 30,
      position: { x: 20, y: 22 },
    }
  ];

  it("renders live resources successfully with appropriate labels", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ResourceNodePanel resources={mockResources} />);
    });

    expect(container!.textContent).toContain("Ancient Oak");
    expect(container!.textContent).toContain("Copper Vein");
    expect(container!.textContent).toContain("Respawns in 30 ticks");
  });

  it("adds loading states, aria-busy and disables the button on gather click", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ResourceNodePanel resources={mockResources} />);
    });

    const gatherBtn = container!.querySelector(".gather-button") as HTMLButtonElement;
    expect(gatherBtn).toBeTruthy();
    expect(gatherBtn.getAttribute("aria-busy")).toBe("false");
    expect(gatherBtn.disabled).toBe(false);

    // Trigger click within act
    await act(async () => {
      gatherBtn.click();
    });

    // Verify custom event dispatched
    expect(dispatchSpy).toHaveBeenCalled();
    const dispatchedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(dispatchedEvent.type).toBe("wasd:client-action");
    expect(dispatchedEvent.detail.action).toBe("resource_gather");
    expect(dispatchedEvent.detail.payload.nodeId).toBe("node-tree-1");

    // Button should now be disabled, showing Gathering... and aria-busy=true
    expect(gatherBtn.disabled).toBe(true);
    expect(gatherBtn.getAttribute("aria-busy")).toBe("true");
    expect(gatherBtn.textContent).toBe("Gathering...");
  });
});
