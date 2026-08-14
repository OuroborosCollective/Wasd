/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MapStatusPanel } from "./MapStatusPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("MapStatusPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const getMockSnapshot = (): LiveGameplaySnapshot => ({
    status: "live",
    serverTick: 100,
    character: null,
    paperdoll: { character: null, slots: [] },
    quests: [],
    skills: [],
    resources: [{ id: "res-1", name: "Iron Ore", type: "ore", quantity: 5 }],
    inventory: { playerId: "p1", schemaVersion: 1, slots: [], capacity: 32 },
    crafting: { recipes: [] },
    equipment: null,
    guild: { id: null, name: null, memberCount: 0, rank: null, villageEligible: false, treasury: null },
    factions: [],
    map: { regionName: "Areloria Central", chunkX: 12, chunkZ: -5, visibleChunks: 9, biome: "forest" },
    wallet: { coin: 100 },
    worldPois: [{ id: "poi-1", name: "Ancient Shrine" }],
    vendorEconomy: { vendors: [] },
    campNpcs: [{ id: "npc-1", name: "Guard" }],
    campStocks: [],
    processingStations: [],
    discoveryStats: {
      discoveredPoiCount: 3,
      discoveredChunkCount: 15,
      visiblePoiCount: 3,
    },
  });

  it("renders live map status panel with accessibility region role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const snapshot = getMockSnapshot();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<MapStatusPanel snapshot={snapshot} activeChunkCount={9} />);
    });

    const panel = container!.querySelector('[data-testid="map-panel-live"]');
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("role")).toBe("region");
    expect(panel?.getAttribute("aria-label")).toBe("Map Status");

    expect(container!.textContent).toContain("Areloria Central");
    expect(container!.textContent).toContain("12, -5");
    expect(container!.textContent).toContain("9");

    document.body.removeChild(container);
  });
});
