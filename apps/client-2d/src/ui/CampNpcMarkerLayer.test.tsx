/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CampNpcMarkerLayer } from "./CampNpcMarkerLayer";

vi.mock("../game/useWorldOverlayModel", () => ({
  useWorldOverlayModel: () => ({
    status: "ready",
  }),
}));

vi.mock("../game/useLiveGameplaySnapshot", () => ({
  useLiveGameplaySnapshot: () => ({
    campNpcs: [
      {
        id: "npc_1",
        poiId: "camp_1",
        name: "Garrick",
        role: "Woodcutter",
        type: "camp_woodcutter",
        activity: "Cutting Timber",
        position: { x: 100, y: 150 },
      },
    ],
    campStocks: [],
  }),
}));

describe("CampNpcMarkerLayer UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    if (typeof window.ResizeObserver === "undefined") {
      class MockResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      window.ResizeObserver = MockResizeObserver as any;
    }
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("renders container landmark region with role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CampNpcMarkerLayer />);
    });

    const layer = container!.querySelector('[data-testid="camp-npc-marker-layer"]');
    expect(layer).toBeTruthy();
    expect(layer!.getAttribute("role")).toBe("region");
    expect(layer!.getAttribute("aria-label")).toBe("Camp Worker Markers");
  });

  it("renders NPC marker with proper ARIA attributes and aria-hidden emoji", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CampNpcMarkerLayer />);
    });

    const markers = container!.querySelectorAll('[data-testid="camp-npc-marker"]');
    expect(markers.length).toBe(1);

    const marker = markers[0] as HTMLButtonElement;
    expect(marker.getAttribute("aria-label")).toBe("Garrick camp worker, Cutting Timber");
    const emojiSpan = marker.querySelector('span[aria-hidden="true"]');
    expect(emojiSpan).toBeTruthy();
    expect(emojiSpan!.textContent).toBe("🪓");
  });
});
