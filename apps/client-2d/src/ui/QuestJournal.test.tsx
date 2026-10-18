/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestJournal } from "./QuestJournal";
import type { QuestState } from "../game/quests";

describe("QuestJournal Accessibility & UX", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  it("returns null when open prop is false", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestJournal
          open={false}
          quests={[]}
          onClose={vi.fn()}
          onTrack={vi.fn()}
        />
      );
    });

    expect(container!.children.length).toBe(0);
  });

  it("renders dialog with proper WAI-ARIA attributes when open", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestJournal
          open={true}
          quests={[]}
          onClose={vi.fn()}
          onTrack={vi.fn()}
        />
      );
    });

    const dialog = container!.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-labelledby")).toBe("quest-journal-modal-title");

    const title = container!.querySelector("#quest-journal-modal-title");
    expect(title).toBeTruthy();
    expect(title!.textContent).toContain("Quest Journal");

    const closeBtn = container!.querySelector(".wow-close-btn");
    expect(closeBtn).toBeTruthy();
    expect(closeBtn!.getAttribute("aria-label")).toBe("Close quest journal [ESC]");
    expect(closeBtn!.getAttribute("aria-keyshortcuts")).toBe("Escape");
    expect(closeBtn!.getAttribute("title")).toBe("Close quest journal [ESC]");
  });

  it("invokes onClose when Escape key is pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onCloseSpy = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestJournal
          open={true}
          quests={[]}
          onClose={onCloseSpy}
          onTrack={vi.fn()}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it("renders empty state notice when no quests exist", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestJournal
          open={true}
          quests={[]}
          onClose={vi.fn()}
          onTrack={vi.fn()}
        />
      );
    });

    expect(container!.textContent).toContain("No active quests in journal.");
  });

  it("renders active quests with card labels, progress bars, and track button interactions", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockQuests: QuestState[] = [
      {
        id: "quest_1",
        title: "Gathering Berries",
        description: "Harvest 5 sweet berries from bushes.",
        status: "active",
        tracked: false,
        objectives: [
          {
            id: "obj_berries",
            label: "Sweet Berries",
            current: 3,
            required: 5
          }
        ]
      },
      {
        id: "quest_2",
        title: "Defeat Bandit Leader",
        description: "Clear the camp in the valley.",
        status: "completed",
        tracked: true,
        objectives: [
          {
            id: "obj_bandit",
            label: "Bandit Leader",
            current: 1,
            required: 1
          }
        ]
      }
    ];

    const onTrackSpy = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <QuestJournal
          open={true}
          quests={mockQuests}
          onClose={vi.fn()}
          onTrack={onTrackSpy}
        />
      );
    });

    const articles = container!.querySelectorAll("article");
    expect(articles).toHaveLength(2);
    expect(articles[0].getAttribute("aria-label")).toBe("Quest: Gathering Berries");
    expect(articles[1].getAttribute("aria-label")).toBe("Quest: Defeat Bandit Leader");

    // Progress bar checks
    const progressBars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressBars).toHaveLength(2);
    expect(progressBars[0].getAttribute("aria-label")).toBe("Sweet Berries progress");
    expect(progressBars[0].getAttribute("aria-valuenow")).toBe("3");
    expect(progressBars[0].getAttribute("aria-valuemax")).toBe("5");
    expect(progressBars[0].getAttribute("title")).toBe("Sweet Berries: 3/5 (60%)");

    // Track button on untracked quest
    const trackBtn = container!.querySelector('button[aria-label="Track Gathering Berries"]') as HTMLButtonElement;
    expect(trackBtn).toBeTruthy();
    expect(trackBtn.getAttribute("title")).toBe("Track Gathering Berries");

    await act(async () => {
      trackBtn.click();
    });

    expect(onTrackSpy).toHaveBeenCalledWith("quest_1");
  });
});
