/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SkillProgressionPanel } from "./SkillProgressionPanel";
import type { SkillSnapshot } from "../../game/liveGameplaySnapshot";

describe("SkillProgressionPanel UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  const sampleSkills: SkillSnapshot[] = [
    {
      id: "woodcutting",
      title: "Woodcutting",
      level: 3,
      xp: 450,
      xpForNextLevel: 1000,
      progressRatio: 0.45,
    },
    {
      id: "mining",
      title: "Mining",
      level: 1,
      xp: 120,
      xpForNextLevel: 400,
      progressRatio: 0.3,
    },
  ];

  it("renders empty state correctly when no skills are present", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={[]} />);
    });

    expect(container!.textContent).toContain("No live skill data yet.");
    expect(container!.querySelector('[data-testid="skill-panel-empty"]')).toBeTruthy();

    document.body.removeChild(container);
  });

  it("renders skills with accessible progress bars and title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={sampleSkills} />);
    });

    expect(container!.textContent).toContain("Woodcutting");
    expect(container!.textContent).toContain("Lv. 3");
    expect(container!.textContent).toContain("Mining");
    expect(container!.textContent).toContain("Lv. 1");

    const progressbars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressbars.length).toBe(2);

    const woodcuttingBar = progressbars[0] as HTMLDivElement;
    expect(woodcuttingBar.getAttribute("aria-label")).toBe("Woodcutting progress to level 4");
    expect(woodcuttingBar.getAttribute("aria-valuenow")).toBe("45");
    expect(woodcuttingBar.getAttribute("aria-valuetext")).toBe("450 / 1000 XP (45%)");
    expect(woodcuttingBar.getAttribute("title")).toBe("450 / 1000 XP (45%)");

    const miningBar = progressbars[1] as HTMLDivElement;
    expect(miningBar.getAttribute("aria-label")).toBe("Mining progress to level 2");
    expect(miningBar.getAttribute("aria-valuenow")).toBe("30");
    expect(miningBar.getAttribute("aria-valuetext")).toBe("120 / 400 XP (30%)");
    expect(miningBar.getAttribute("title")).toBe("120 / 400 XP (30%)");

    document.body.removeChild(container);
  });
});
