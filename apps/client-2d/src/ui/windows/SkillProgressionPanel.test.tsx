/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
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
    vi.clearAllMocks();
  });

  const mockSkills: SkillSnapshot[] = [
    {
      id: "woodcutting",
      title: "Woodcutting",
      level: 5,
      xp: 150,
      xpForNextLevel: 400,
      progressRatio: 0.375, // 37.5%, rounded to 38%
    },
    {
      id: "mining",
      title: "Mining",
      level: 12,
      xp: 800,
      xpForNextLevel: 1000,
      progressRatio: 0.8, // 80%
    },
  ];

  it("renders empty state correctly when no skills are provided", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={[]} />);
    });

    const emptySection = container!.querySelector('[data-testid="skill-panel-empty"]');
    expect(emptySection).toBeTruthy();
    expect(container!.textContent).toContain("No live skill data yet.");
  });

  it("renders live skills and progression stats successfully", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={mockSkills} />);
    });

    const liveSection = container!.querySelector('[data-testid="skill-panel-live"]');
    expect(liveSection).toBeTruthy();

    expect(container!.textContent).toContain("Woodcutting");
    expect(container!.textContent).toContain("Lv. 5");
    expect(container!.textContent).toContain("150");
    expect(container!.textContent).toContain("400 XP");

    expect(container!.textContent).toContain("Mining");
    expect(container!.textContent).toContain("Lv. 12");
    expect(container!.textContent).toContain("800");
    expect(container!.textContent).toContain("1000 XP");
  });

  it("implements progressbar accessibility attributes correctly with human-readable text and tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={mockSkills} />);
    });

    const progressBars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBe(2);

    // 1st Skill: Woodcutting
    const woodcuttingBar = progressBars[0];
    expect(woodcuttingBar.getAttribute("aria-label")).toBe("Woodcutting progress to level 6");
    expect(woodcuttingBar.getAttribute("aria-valuenow")).toBe("38"); // 37.5 rounded is 38
    expect(woodcuttingBar.getAttribute("aria-valuemin")).toBe("0");
    expect(woodcuttingBar.getAttribute("aria-valuemax")).toBe("100");
    expect(woodcuttingBar.getAttribute("aria-valuetext")).toBe("150 / 400 XP (38%)");
    expect(woodcuttingBar.getAttribute("title")).toBe("150 / 400 XP (38%)");

    // 2nd Skill: Mining
    const miningBar = progressBars[1];
    expect(miningBar.getAttribute("aria-label")).toBe("Mining progress to level 13");
    expect(miningBar.getAttribute("aria-valuenow")).toBe("80");
    expect(miningBar.getAttribute("aria-valuemin")).toBe("0");
    expect(miningBar.getAttribute("aria-valuemax")).toBe("100");
    expect(miningBar.getAttribute("aria-valuetext")).toBe("800 / 1000 XP (80%)");
    expect(miningBar.getAttribute("title")).toBe("800 / 1000 XP (80%)");
  });
});
