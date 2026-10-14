/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { WorldPoiMarkerLayer } from "./WorldPoiMarkerLayer";

vi.mock("../game/useWorldOverlayModel", () => ({
  useWorldOverlayModel: () => ({
    status: "ready",
    pois: [
      { poiId: "camp_1", type: "logging_camp", title: "Pine Logging Camp", x: 100, y: 150, discovered: true },
      { poiId: "camp_2", type: "mining_camp", title: "Iron Mine", x: 200, y: 250, discovered: false },
    ],
  }),
}));

vi.mock("../game/useLiveGameplaySnapshot", () => ({
  useLiveGameplaySnapshot: () => ({
    recentDiscoveries: [],
  }),
}));

describe("WorldPoiMarkerLayer UX & Accessibility", () => {
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
      root.render(<WorldPoiMarkerLayer />);
    });

    const layer = container!.querySelector('[data-testid="world-poi-marker-layer"]');
    expect(layer).toBeTruthy();
    expect(layer!.getAttribute("role")).toBe("region");
    expect(layer!.getAttribute("aria-label")).toBe("World Point of Interest Markers");
  });

  it("renders markers with proper ARIA attributes and aria-hidden emoji", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<WorldPoiMarkerLayer />);
    });

    const markers = container!.querySelectorAll('[data-testid="world-poi-marker"]');
    expect(markers.length).toBe(2);

    const discoveredMarker = markers[0] as HTMLButtonElement;
    expect(discoveredMarker.getAttribute("aria-label")).toBe("Pine Logging Camp world POI, logging_camp");
    const emojiSpan = discoveredMarker.querySelector('span[aria-hidden="true"]');
    expect(emojiSpan).toBeTruthy();
    expect(emojiSpan!.textContent).toBe("🪓");

    const undiscoveredMarker = markers[1] as HTMLButtonElement;
    expect(undiscoveredMarker.getAttribute("aria-label")).toBe("Unknown world POI");
  });
});
