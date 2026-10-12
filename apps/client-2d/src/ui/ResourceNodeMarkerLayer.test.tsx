/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ResourceNodeMarkerLayer } from "./ResourceNodeMarkerLayer";

// Mock WorldOverlayModel hook to supply controlled test state
vi.mock("../game/useWorldOverlayModel", () => ({
  useWorldOverlayModel: vi.fn(() => ({
    status: "fresh",
    resourceNodes: [
      {
        id: "node-1",
        title: "Copper Vein",
        kind: "ore",
        x: 100,
        y: 200,
        status: "available",
      },
    ],
    surfaceGroups: [
      { id: "house-1", title: "Ironforge Guildhall" }
    ],
    surfacePoints: [
      { id: "point-1", x: 150, y: 250 }
    ],
  })),
}));

// Mock LiveGameplaySnapshot hook
vi.mock("../game/useLiveGameplaySnapshot", () => ({
  useLiveGameplaySnapshot: vi.fn(() => ({
    serverTick: 100,
  })),
}));

// Mock dispatchGather
vi.mock("../game/gameplayActions", () => ({
  dispatchGather: vi.fn(async () => ({
    ok: false,
    error: "missing_tool",
    requiredTool: "mining_tool",
  })),
  DEFAULT_GAMEPLAY_PLAYER_ID: "player-1",
}));

describe("ResourceNodeMarkerLayer UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    // Mock ResizeObserver
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  it("renders node markers with aria-label and aria-hidden on emoji icon", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ResourceNodeMarkerLayer />);
    });

    const marker = container!.querySelector("[data-testid='resource-node-marker']");
    expect(marker).toBeTruthy();
    expect(marker!.getAttribute("aria-label")).toBe("Copper Vein resource node, available");
    expect(marker!.getAttribute("title")).toBe("Copper Vein - Tap to gather");

    // Visual icon span must have aria-hidden="true" to avoid redundant emoji vocalization
    const iconSpan = marker!.querySelector("span[aria-hidden='true']");
    expect(iconSpan).toBeTruthy();
    expect(iconSpan!.textContent).toBe("⛏️");
  });

  it("renders lineage house marker with aria-hidden on house emoji", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ResourceNodeMarkerLayer />);
    });

    const houseMarker = container!.querySelector("[data-testid='world-surface-house-marker']");
    expect(houseMarker).toBeTruthy();
    const houseEmoji = houseMarker!.querySelector("span[aria-hidden='true']");
    expect(houseEmoji).toBeTruthy();
    expect(houseEmoji!.textContent).toContain("🏠");
  });

  it("renders error feedback overlay with role='status' and aria-live='polite' when gather fails", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ResourceNodeMarkerLayer />);
    });

    const marker = container!.querySelector("[data-testid='resource-node-marker']");
    expect(marker).toBeTruthy();

    await act(async () => {
      (marker as HTMLButtonElement).click();
    });

    const feedback = container!.querySelector("[data-testid='resource-gather-feedback']");
    expect(feedback).toBeTruthy();
    expect(feedback!.getAttribute("role")).toBe("status");
    expect(feedback!.getAttribute("aria-live")).toBe("polite");
    expect(feedback!.textContent).toBe("Missing required tool: Pickaxe");
  });
});
