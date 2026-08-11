/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { FactionStandingPanel } from "./FactionStandingPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("FactionStandingPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const getWaitingSnapshot = (): LiveGameplaySnapshot => ({
    status: "waiting",
    serverTick: null,
    character: null,
    paperdoll: { character: null, slots: [] },
    quests: [],
    skills: [],
    resources: [],
    inventory: { playerId: "unknown", schemaVersion: 1, slots: [], capacity: 32 },
    crafting: { recipes: [] },
    equipment: null,
    guild: { id: null, name: null, memberCount: 0, rank: null, villageEligible: false, treasury: null },
    factions: [],
    map: { regionName: "unknown", chunkX: null, chunkZ: null, visibleChunks: null, biome: null },
    wallet: { coin: 0 },
    worldPois: [],
    vendorEconomy: { vendors: [] },
    campNpcs: [],
    campStocks: [],
    processingStations: [],
  });

  const getEmptySnapshot = (): LiveGameplaySnapshot => ({
    ...getWaitingSnapshot(),
    status: "live",
  });

  const getLiveSnapshot = (): LiveGameplaySnapshot => ({
    ...getEmptySnapshot(),
    factions: [
      {
        id: "faction-1",
        name: "Emerald Vanguard",
        standing: 75,
        label: "allied",
      },
      {
        id: "faction-2",
        name: "Ashen Brotherhood",
        standing: 15,
        label: "hostile",
      },
    ],
  });

  it("renders waiting state successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<FactionStandingPanel snapshot={getWaitingSnapshot()} />);
    });

    expect(container!.textContent).toContain("waiting for server snapshot");
    expect(container!.querySelector('[data-testid="faction-panel-waiting"]')).toBeTruthy();

    document.body.removeChild(container);
  });

  it("renders empty state successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<FactionStandingPanel snapshot={getEmptySnapshot()} />);
    });

    expect(container!.textContent).toContain("no standings yet");
    expect(container!.querySelector('[data-testid="faction-panel-empty"]')).toBeTruthy();

    document.body.removeChild(container);
  });

  it("renders live state with accessibility attributes and tooltips successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<FactionStandingPanel snapshot={getLiveSnapshot()} />);
    });

    expect(container!.textContent).toContain("Emerald Vanguard");
    expect(container!.textContent).toContain("Ashen Brotherhood");

    const progressbars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressbars.length).toBe(2);

    const firstBar = progressbars[0] as HTMLDivElement;
    expect(firstBar.getAttribute("aria-label")).toBe("Emerald Vanguard faction standing: allied");
    expect(firstBar.getAttribute("aria-valuenow")).toBe("75");
    expect(firstBar.getAttribute("aria-valuetext")).toBe("75% (allied)");
    expect(firstBar.getAttribute("title")).toBe("Emerald Vanguard Standing: 75% (allied)");

    const secondBar = progressbars[1] as HTMLDivElement;
    expect(secondBar.getAttribute("aria-label")).toBe("Ashen Brotherhood faction standing: hostile");
    expect(secondBar.getAttribute("aria-valuenow")).toBe("15");
    expect(secondBar.getAttribute("aria-valuetext")).toBe("15% (hostile)");
    expect(secondBar.getAttribute("title")).toBe("Ashen Brotherhood Standing: 15% (hostile)");

    document.body.removeChild(container);
  });
});
