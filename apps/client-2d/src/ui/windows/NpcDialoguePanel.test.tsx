/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NpcDialoguePanel } from "./NpcDialoguePanel";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

describe("NpcDialoguePanel UX & Accessibility", () => {
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

  const mockSnapshot: LiveGameplaySnapshot = {
    status: "live",
    npcDialogues: [
      {
        npcId: "village_trader_001",
        displayName: "Elder Alden",
        dialogueState: "quest_available",
        line: "Greetings traveler, we are in dire need of timber.",
      },
    ],
    availableQuests: [
      {
        questId: "village_supply_order_001",
        state: "available",
        objectives: [
          {
            objectiveId: "gather_wood_01",
            title: "Gather Oak Wood",
            current: 0,
            required: 10,
            completed: false,
          },
        ],
      },
    ],
    activeQuests: [],
    npcReputations: [
      {
        npcId: "village_trader_001",
        reputation: 5,
      },
    ],
  };

  it("renders non-live status message with polite aria-live attribute", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcDialoguePanel snapshot={{ ...mockSnapshot, status: "waiting" }} />
      );
    });

    const statusEl = container!.querySelector("[data-testid='npc-dialogue-runtime-state']");
    expect(statusEl).toBeTruthy();
    expect(statusEl?.getAttribute("aria-live")).toBe("polite");
    expect(statusEl?.textContent).toContain("NPC STATE WAITING");
  });

  it("renders NPC dialogue panel with region role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onAccept = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcDialoguePanel snapshot={mockSnapshot} onAcceptQuest={onAccept} />
      );
    });

    const panel = container!.querySelector("[data-testid='npc-dialogue-village_trader_001']");
    expect(panel).toBeTruthy();
    expect(panel?.getAttribute("role")).toBe("region");
    expect(panel?.getAttribute("aria-label")).toBe("NPC Dialogue");

    const acceptBtn = container!.querySelector("[data-testid='accept-quest-village_supply_order_001']") as HTMLButtonElement;
    expect(acceptBtn).toBeTruthy();
    expect(acceptBtn.getAttribute("aria-label")).toBe("Accept Village Supply Order");
    expect(acceptBtn.getAttribute("title")).toBe("Accept Village Supply Order");

    await act(async () => {
      acceptBtn.click();
    });
    expect(onAccept).toHaveBeenCalledWith("village_supply_order_001");
  });

  it("renders quest objectives with WAI-ARIA progressbar attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const activeSnapshot: LiveGameplaySnapshot = {
      ...mockSnapshot,
      availableQuests: [],
      activeQuests: [
        {
          questId: "village_supply_order_001",
          state: "ready_to_complete",
          objectives: [
            {
              objectiveId: "gather_wood_01",
              title: "Gather Oak Wood",
              current: 10,
              required: 10,
              completed: true,
            },
          ],
        },
      ],
    };

    const onComplete = vi.fn();
    const onTalk = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <NpcDialoguePanel
          snapshot={activeSnapshot}
          onCompleteQuest={onComplete}
          onTalkToNpc={onTalk}
        />
      );
    });

    const objective = container!.querySelector("[data-testid='quest-objective-gather_wood_01']");
    expect(objective).toBeTruthy();
    expect(objective?.getAttribute("role")).toBe("progressbar");
    expect(objective?.getAttribute("aria-valuenow")).toBe("10");
    expect(objective?.getAttribute("aria-valuemin")).toBe("0");
    expect(objective?.getAttribute("aria-valuemax")).toBe("10");
    expect(objective?.getAttribute("aria-valuetext")).toContain("Gather Oak Wood: 10 of 10 (Completed)");

    const completeBtn = container!.querySelector("[data-testid='complete-quest-village_supply_order_001']") as HTMLButtonElement;
    expect(completeBtn).toBeTruthy();
    expect(completeBtn.getAttribute("aria-label")).toBe("Complete Village Supply Order");

    const talkBtn = container!.querySelector(".cz-action-btn--talk") as HTMLButtonElement;
    expect(talkBtn).toBeTruthy();
    expect(talkBtn.getAttribute("aria-label")).toBe("Talk to Elder Alden");

    await act(async () => {
      completeBtn.click();
      talkBtn.click();
    });

    expect(onComplete).toHaveBeenCalledWith("village_supply_order_001");
    expect(onTalk).toHaveBeenCalledWith("village_trader_001");
  });
});
