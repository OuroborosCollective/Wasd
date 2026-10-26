/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CausalCatchupPanel } from "./CausalCatchupPanel";
import type { CausalCatchupSummaryPayload } from "../net/protocol";

describe("CausalCatchupPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
      root = null;
    }
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  const validSummary: CausalCatchupSummaryPayload = {
    summaryHash: "a1b2c3d4e5f67890",
    eventCount: 2,
    firstTick: 100,
    lastTick: 105,
    sideChannelOnly: true,
    events: [
      {
        eventId: "evt-1",
        type: "resource_depleted",
        tick: 102,
        significancePerMille: 500,
        regionId: "Forest Region <North>",
        chunkKey: "0,0",
        payloadHash: "p1",
        eventHash: "e1",
      },
      {
        eventId: "evt-2",
        type: "quest_completed",
        tick: 105,
        significancePerMille: 800,
        regionId: "Village Square",
        chunkKey: "0,1",
        payloadHash: "p2",
        eventHash: "e2",
      },
    ],
  };

  it("returns null when summary is invalid or empty", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<CausalCatchupPanel summary={null} />);
    });

    expect(container.firstElementChild).toBeNull();
  });

  it("renders aside landmark with aria-label, aria-live, and category icons", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<CausalCatchupPanel summary={validSummary} />);
    });

    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(aside!.getAttribute("aria-label")).toBe("Causal Catchup Events");
    expect(aside!.getAttribute("aria-live")).toBe("polite");

    const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThanOrEqual(2);
    expect(hiddenIcons[0].textContent).toContain("🪵");
    expect(hiddenIcons[1].textContent).toContain("📜");
  });

  it("preserves raw region string without pre-escaping into double HTML entities", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<CausalCatchupPanel summary={validSummary} />);
    });

    const regionEl = container.querySelector(".causal-catchup-event-region");
    expect(regionEl).toBeTruthy();
    expect(regionEl!.textContent).toBe("Forest Region <North>");
  });

  it("displays hash code badge with title hover tooltip showing full hash", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<CausalCatchupPanel summary={validSummary} />);
    });

    const hashBadge = container.querySelector("footer code");
    expect(hashBadge).toBeTruthy();
    expect(hashBadge!.getAttribute("title")).toBe("Full Hash: a1b2c3d4e5f67890");
    expect(hashBadge!.textContent).toBe("a1b2c3d4...");
  });
});
