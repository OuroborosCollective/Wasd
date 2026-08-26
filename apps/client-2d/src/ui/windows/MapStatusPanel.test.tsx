/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MapStatusPanel } from "./MapStatusPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("MapStatusPanel UX & Accessibility", () => {
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

  const mockSnapshot: LiveGameplaySnapshot = {
    status: "live",
    map: {
      regionName: "Ironpine Wilderness",
      chunkX: 5,
      chunkZ: -3,
      visibleChunks: 9,
      biome: "Taiga",
    },
    resources: [
      { id: "node-1", kind: "tree", title: "Oak", status: "available", xpReward: 10, itemRewardId: "wood", itemRewardName: "Wood", remainingTicks: 0, position: { x: 0, y: 0 } },
    ],
    worldPois: [
      { id: "poi-1", title: "Ancient Shrine", type: "shrine", x: 10, y: 10, discovered: true },
    ],
    campNpcs: [
      { id: "npc-1", name: "Trader Joe", role: "vendor", status: "active", position: { x: 5, y: 5 } },
    ],
    discoveryStats: {
      discoveredPoiCount: 3,
      discoveredChunkCount: 12,
      visiblePoiCount: 3,
    },
    character: { displayName: "Hero", archetype: "Warrior", level: 1 },
    vitals: { hp: 100, maxHp: 100, hpPercent: 100, stamina: 50, maxStamina: 50, staminaPercent: 100 },
    inventory: { items: [], capacity: 20, gold: 100 },
    paperdoll: { character: { displayName: "Hero", archetype: "Warrior" }, slots: [] },
    skills: [],
    guild: { memberCount: 1, villageEligible: false },
    factionStandings: [],
    quests: [],
    activeTrade: null,
    gatherTools: [],
    workOrders: [],
    tradeOrders: [],
    aurionTransition: {
      schemaVersion: "aurion-transition-snapshot.v1",
      persistence: "ephemeral",
      playerId: "player_test",
      sessionId: "aurion:player_test",
      status: "active",
      zoneId: "expanse",
      entryPointId: "expanse:arrival",
      returnPointId: "tower:threshold",
      lastAppliedTick: 8,
      lastAcceptedSequence: 1,
      pendingRequestCount: 0,
      transitionHash: "a".repeat(64),
    },
  };

  it("renders live map status metrics with role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<MapStatusPanel snapshot={mockSnapshot} activeChunkCount={9} />);
    });

    const regionContainer = container!.querySelector('[data-testid="map-panel-live"]');
    expect(regionContainer).toBeTruthy();
    expect(regionContainer!.getAttribute("role")).toBe("region");
    expect(regionContainer!.getAttribute("aria-label")).toBe("Map and Exploration Status");

    expect(container!.textContent).toContain("Ironpine Wilderness");
    expect(container!.textContent).toContain("5, -3");
    expect(container!.textContent).toContain("9");
  });

  it("renders the server-confirmed Aurion transition status without introducing a client action", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<MapStatusPanel snapshot={mockSnapshot} activeChunkCount={9} />);
    });

    const aurion = container!.querySelector('[data-testid="aurion-transition-status"]');
    expect(aurion).toBeTruthy();
    expect(aurion!.textContent).toContain("expanse · active");
    expect(aurion!.textContent).toContain("ephemeral");
  });

  it("provides hover title tooltips and screen reader aria-labels on metric cards", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<MapStatusPanel snapshot={mockSnapshot} activeChunkCount={9} />);
    });

    const articles = container!.querySelectorAll(".stitch-info");
    expect(articles.length).toBeGreaterThan(0);

    const regionArticle = articles[0];
    expect(regionArticle.getAttribute("title")).toBe("Region: Ironpine Wilderness");
    expect(regionArticle.getAttribute("aria-label")).toBe("Region: Ironpine Wilderness");

    const chunkArticle = articles[1];
    expect(chunkArticle.getAttribute("title")).toBe("Chunk coordinates: 5, -3");
    expect(chunkArticle.getAttribute("aria-label")).toBe("Chunk: 5, -3");
  });
});
