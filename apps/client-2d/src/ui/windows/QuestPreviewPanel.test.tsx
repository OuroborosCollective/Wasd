/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestPreviewPanel } from "./QuestPreviewPanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("QuestPreviewPanel UX & Accessibility", () => {
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

  it("renders waiting state with correct ARIA attributes when status is waiting", async () => {
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
      root.render(
        <QuestPreviewPanel snapshot={mockSnapshot} onOpenJournal={vi.fn()} />
      );
    });

    const panel = container!.querySelector('[data-testid="quest-preview-waiting"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(panel.getAttribute("aria-live")).toBe("polite");
    expect(container!.textContent).toContain("Waiting for server snapshot…");
  });

  it("renders empty state with correct ARIA attributes when there are no quests", async () => {
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

    const handleOpenJournal = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestPreviewPanel snapshot={mockSnapshot} onOpenJournal={handleOpenJournal} />
      );
    });

    const panel = container!.querySelector('[data-testid="quest-preview-empty"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("aria-busy")).toBe("false");
    expect(container!.textContent).toContain("No active quest");

    const button = container!.querySelector("button") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute("aria-label")).toBe("Open Quest Journal [Q]");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("q");
    expect(button.getAttribute("title")).toBe("Open Quest Journal [Q]");

    await act(async () => {
      button.click();
    });
    expect(handleOpenJournal).toHaveBeenCalledTimes(1);
  });

  it("renders active quest and progressbar with scaled ARIA values", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: LiveGameplaySnapshot = {
      playerId: "test-player-1",
      schemaVersion: 1,
      status: "live",
      quests: [
        {
          id: "start_path_gather",
          title: "Gathering Wood",
          description: "Collect logs outside the village.",
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
      ],
      inventory: { playerId: "test-player-1", schemaVersion: 1, capacity: 32, slots: [] },
      equipment: { playerId: "test-player-1", schemaVersion: 1, slots: [] },
      wallet: { coin: 0 },
      resources: [],
    };

    const handleOpenJournal = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestPreviewPanel snapshot={mockSnapshot} onOpenJournal={handleOpenJournal} />
      );
    });

    const panel = container!.querySelector('[data-testid="quest-preview-live"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("aria-busy")).toBe("false");
    expect(container!.textContent).toContain("Gathering Wood");

    const progressBar = container!.querySelector('[role="progressbar"]') as HTMLElement;
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("3");
    expect(progressBar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("5");
    expect(progressBar.getAttribute("aria-valuetext")).toBe("3 of 5 Wood Log");
    expect(progressBar.getAttribute("title")).toBe("Wood Log: 3/5 (60%)");

    const button = container!.querySelector("button") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute("aria-label")).toBe("Open Quest Journal [Q]");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("q");
    expect(button.getAttribute("title")).toBe("Open Quest Journal [Q]");

    await act(async () => {
      button.click();
    });
    expect(handleOpenJournal).toHaveBeenCalledTimes(1);
  });
});
