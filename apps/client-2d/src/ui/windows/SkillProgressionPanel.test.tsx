/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SkillProgressionPanel } from "./SkillProgressionPanel";
import type { SkillSnapshot } from "../../game/liveGameplaySnapshot";

describe("SkillProgressionPanel UX & Accessibility", () => {
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

  const mockSkills: SkillSnapshot[] = [
    {
      id: "woodcutting",
      title: "Woodcutting",
      level: 12,
      xp: 250,
      xpForNextLevel: 500,
      progressRatio: 0.5,
    },
    {
      id: "mining",
      title: "Mining",
      level: 5,
      xp: 75,
      xpForNextLevel: 100,
      progressRatio: 0.75,
    },
  ];

  it("renders empty state notice with proper region and live status accessibility attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={[]} />);
    });

    const emptySection = container.querySelector("[data-testid='skill-panel-empty']");
    expect(emptySection).toBeTruthy();
    expect(emptySection?.getAttribute("role")).toBe("region");
    expect(emptySection?.getAttribute("aria-label")).toBe("Skill Progression");

    const emptyMsg = emptySection?.querySelector(".are-text-muted");
    expect(emptyMsg?.getAttribute("role")).toBe("status");
    expect(emptyMsg?.getAttribute("aria-live")).toBe("polite");
    expect(emptyMsg?.textContent).toContain("No live skill data yet.");
  });

  it("renders live skill rows with progress bars containing aria-valuetext and title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={mockSkills} />);
    });

    const liveSection = container.querySelector("[data-testid='skill-panel-live']");
    expect(liveSection).toBeTruthy();
    expect(liveSection?.getAttribute("role")).toBe("region");
    expect(liveSection?.getAttribute("aria-label")).toBe("Skill Progression");

    // Check Woodcutting row
    const wcBar = container.querySelector("[data-testid='skill-progress-woodcutting'] .skill-row__bar");
    expect(wcBar).toBeTruthy();
    expect(wcBar?.getAttribute("role")).toBe("progressbar");
    expect(wcBar?.getAttribute("aria-label")).toBe("Woodcutting progress to level 13");
    expect(wcBar?.getAttribute("aria-valuenow")).toBe("50");
    expect(wcBar?.getAttribute("aria-valuemin")).toBe("0");
    expect(wcBar?.getAttribute("aria-valuemax")).toBe("100");
    expect(wcBar?.getAttribute("aria-valuetext")).toBe("250 / 500 XP (50%)");
    expect(wcBar?.getAttribute("title")).toBe("250 / 500 XP (50%)");

    // Check Mining row
    const miningBar = container.querySelector("[data-testid='skill-progress-mining'] .skill-row__bar");
    expect(miningBar).toBeTruthy();
    expect(miningBar?.getAttribute("role")).toBe("progressbar");
    expect(miningBar?.getAttribute("aria-label")).toBe("Mining progress to level 6");
    expect(miningBar?.getAttribute("aria-valuenow")).toBe("75");
    expect(miningBar?.getAttribute("aria-valuetext")).toBe("75 / 100 XP (75%)");
    expect(miningBar?.getAttribute("title")).toBe("75 / 100 XP (75%)");
  });
});
