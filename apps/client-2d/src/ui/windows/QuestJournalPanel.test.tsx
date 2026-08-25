/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestJournalPanel } from "./QuestJournalPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("QuestJournalPanel Accessibility & UX", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it("renders waiting state with WAI-ARIA region and live attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: LiveGameplaySnapshot = {
      playerId: "test-player-1",
      schemaVersion: 1,
      status: "waiting",
      quests: [],
      inventory: { playerId: "test-player-1", schemaVersion: 1, capacity: 32, slots: [] },
      equipment: { playerId: "test-player-1", schemaVersion: 1, slots: [] },
      wallet: { coin: 0 },
      resources: [],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<QuestJournalPanel snapshot={mockSnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="quest-panel-waiting"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toBe("Quest Sync");
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(panel.getAttribute("aria-live")).toBe("polite");
    expect(container!.textContent).toContain("waiting for server snapshot");
  });

  it("renders empty state with WAI-ARIA region attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: LiveGameplaySnapshot = {
      playerId: "test-player-1",
      schemaVersion: 1,
      status: "live",
      quests: [],
      inventory: { playerId: "test-player-1", schemaVersion: 1, capacity: 32, slots: [] },
      equipment: { playerId: "test-player-1", schemaVersion: 1, slots: [] },
      wallet: { coin: 0 },
      resources: [],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<QuestJournalPanel snapshot={mockSnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="quest-panel-empty"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toBe("Quest Journal");
    expect(container!.textContent).toContain("no active quests");
  });

  it("renders active quests with card labels, progress bar tooltips, and claim button properties", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: LiveGameplaySnapshot = {
      playerId: "test-player-1",
      schemaVersion: 1,
      status: "live",
      quests: [
        {
          id: "gather_wood_1",
          title: "Gathering Wood",
          description: "Collect timber for camp.",
          status: "active",
          objectives: [
            {
              id: "wood_log",
              label: "Wood Log",
              current: 3,
              required: 5,
              completed: false,
            },
          ],
        },
        {
          id: "slay_goblins_1",
          title: "Clear Outpost",
          description: "Defeat enemies at boundary.",
          status: "completed",
          objectives: [
            {
              id: "goblin_scout",
              label: "Goblin Scout",
              current: 2,
              required: 2,
              completed: true,
            },
          ],
        },
      ],
      inventory: { playerId: "test-player-1", schemaVersion: 1, capacity: 32, slots: [] },
      equipment: { playerId: "test-player-1", schemaVersion: 1, slots: [] },
      wallet: { coin: 0 },
      resources: [],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<QuestJournalPanel snapshot={mockSnapshot} />);
    });

    const panel = container!.querySelector('[data-testid="quest-panel-live"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("role")).toBe("region");
    expect(panel.getAttribute("aria-label")).toBe("Active Quests");

    const questCards = container!.querySelectorAll("article.quest-journal-card");
    expect(questCards).toHaveLength(2);
    expect(questCards[0].getAttribute("aria-label")).toBe("Quest: Gathering Wood");
    expect(questCards[1].getAttribute("aria-label")).toBe("Quest: Clear Outpost");

    const progressBars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressBars).toHaveLength(2);
    expect(progressBars[0].getAttribute("aria-label")).toBe("Wood Log progress");
    expect(progressBars[0].getAttribute("title")).toBe("Wood Log: 3/5 (60%)");

    const claimButton = container!.querySelector('[data-testid="quest-claim-slay_goblins_1"]') as HTMLButtonElement;
    expect(claimButton).toBeTruthy();
    expect(claimButton.getAttribute("aria-label")).toBe("Claim reward for Clear Outpost");
    expect(claimButton.getAttribute("title")).toBe("Claim reward for Clear Outpost");
  });
});
