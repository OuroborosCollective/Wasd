/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CausalCatchupPanel } from "./CausalCatchupPanel";
import type { CausalCatchupSummaryPayload } from "../net/protocol";

const mockSummary: CausalCatchupSummaryPayload = {
  eventCount: 2,
  firstTick: 100,
  lastTick: 150,
  sideChannelOnly: true,
  summaryHash: "a1b2c3d4e5f6789012345678",
  events: [
    {
      eventId: "e1",
      tick: 105,
      type: "resource_depleted",
      regionId: "iron_mine_alpha",
      significancePerMille: 800,
      chunkKey: "chunk_0_0",
      payloadHash: "p1",
      eventHash: "h1"
    },
    {
      eventId: "e2",
      tick: 140,
      type: "quest_completed",
      regionId: "whispering_woods",
      significancePerMille: 950,
      chunkKey: "chunk_1_1",
      payloadHash: "p2",
      eventHash: "h2"
    }
  ]
};

describe("CausalCatchupPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("returns null when payload is invalid or null", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={null} />);
    });

    expect(container!.children.length).toBe(0);
  });

  it("returns null when eventCount is 0", async () => {
    const emptySummary: CausalCatchupSummaryPayload = {
      eventCount: 0,
      firstTick: null,
      lastTick: null,
      sideChannelOnly: true,
      events: [],
      summaryHash: "00000000"
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={emptySummary} />);
    });

    expect(container!.children.length).toBe(0);
  });

  it("renders panel with accessible region role, aria-label, aria-live, and atomic attributes", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={mockSummary} />);
    });

    const aside = container!.querySelector('aside[role="region"]');
    expect(aside).toBeTruthy();
    expect(aside?.getAttribute("aria-label")).toBe("Causal Catchup Summary");
    expect(aside?.getAttribute("aria-live")).toBe("polite");
    expect(aside?.getAttribute("aria-atomic")).toBe("true");
    expect(aside?.getAttribute("data-event-count")).toBe("2");
  });

  it("renders event rows with tooltips, aria-labels, and tick details", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={mockSummary} />);
    });

    const eventRows = container!.querySelectorAll(".causal-catchup-event");
    expect(eventRows.length).toBe(2);

    const firstRow = eventRows[0];
    expect(firstRow.getAttribute("aria-label")).toBe(
      "Event: Resource Depleted at tick 105 in region iron_mine_alpha"
    );
    expect(firstRow.getAttribute("title")).toBe(
      "Event: Resource Depleted at tick 105 in region iron_mine_alpha"
    );

    const secondRow = eventRows[1];
    expect(secondRow.getAttribute("aria-label")).toBe(
      "Event: Quest Complete at tick 140 in region whispering_woods"
    );
    expect(secondRow.getAttribute("title")).toBe(
      "Event: Quest Complete at tick 140 in region whispering_woods"
    );
  });

  it("renders footer with full summary hash tooltip", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CausalCatchupPanel summary={mockSummary} />);
    });

    const code = container!.querySelector(".causal-catchup-footer code");
    expect(code).toBeTruthy();
    expect(code?.getAttribute("title")).toBe(
      "Summary Digest Hash: a1b2c3d4e5f6789012345678"
    );
  });
});
