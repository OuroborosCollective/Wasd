/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CausalCatchupPanel } from "./CausalCatchupPanel";
import type { CausalCatchupSummaryPayload } from "../net/protocol";

describe("CausalCatchupPanel UX & Accessibility", () => {
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

  it("returns null when summary is invalid", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={null} />);
    });

    expect(container!.children.length).toBe(0);
    expect(container!.textContent).toBe("");
  });

  it("returns null when eventCount is zero", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const emptySummary: CausalCatchupSummaryPayload = {
      firstTick: 100,
      lastTick: 105,
      eventCount: 0,
      summaryHash: "abc1234567890",
      events: [],
      sideChannelOnly: true
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={emptySummary} />);
    });

    expect(container!.children.length).toBe(0);
  });

  it("renders causal catchup events with proper landmark attributes and category icons", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSummary: CausalCatchupSummaryPayload = {
      firstTick: 120,
      lastTick: 150,
      eventCount: 2,
      summaryHash: "deadbeef9999",
      sideChannelOnly: true,
      events: [
        {
          type: "resource_depleted",
          eventId: "evt-1",
          tick: 125,
          significancePerMille: 500,
          regionId: "OakForest_01",
          chunkKey: "chunk_0_0",
          payloadHash: "hash1",
          eventHash: "ehash1"
        },
        {
          type: "quest_completed",
          eventId: "evt-2",
          tick: 140,
          significancePerMille: 800,
          regionId: "Arelor_Town",
          chunkKey: "chunk_0_1",
          payloadHash: "hash2",
          eventHash: "ehash2"
        }
      ]
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={mockSummary} />);
    });

    const panel = container!.querySelector("aside");
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute("aria-labelledby")).toBe("causal-catchup-title");
    expect(panel!.getAttribute("aria-live")).toBe("polite");

    const title = container!.querySelector("#causal-catchup-title");
    expect(title).toBeTruthy();
    expect(title!.textContent?.trim()).toBe("Causal Catchup");

    const tickRange = container!.querySelector(".causal-catchup-tick-range");
    expect(tickRange).toBeTruthy();
    expect(tickRange!.textContent).toContain("120 - 150");

    const events = container!.querySelectorAll(".causal-catchup-event");
    expect(events.length).toBe(2);

    // Verify visual category icons with aria-hidden="true"
    const icons = container!.querySelectorAll(".causal-catchup-event-icon");
    expect(icons.length).toBe(2);
    expect(icons[0].getAttribute("aria-hidden")).toBe("true");
    expect(icons[0].textContent?.trim()).toBe("🪵");
    expect(icons[1].textContent?.trim()).toBe("✅");

    const hashFooter = container!.querySelector(".causal-catchup-footer");
    expect(hashFooter).toBeTruthy();
    expect(hashFooter!.textContent).toContain("deadbeef");
  });
});
