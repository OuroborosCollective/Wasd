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

  it("renders empty state when skills list is empty", async () => {
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

  it("renders skills list with aria-valuetext and title tooltip on progress bar", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSkills: SkillSnapshot[] = [
      {
        id: "woodcutting",
        title: "Woodcutting",
        level: 5,
        xp: 250,
        xpForNextLevel: 500,
        progressRatio: 0.5,
      },
      {
        id: "mining",
        title: "Mining",
        level: 12,
        xp: 1200,
        xpForNextLevel: 1500,
        progressRatio: 0.8,
      },
    ];

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={mockSkills} />);
    });

    expect(container!.querySelector('[data-testid="skill-panel-live"]')).toBeTruthy();
    expect(container!.textContent).toContain("Woodcutting");
    expect(container!.textContent).toContain("Lv. 5");
    expect(container!.textContent).toContain("Mining");
    expect(container!.textContent).toContain("Lv. 12");

    const progressBars = container!.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBe(2);

    const firstBar = progressBars[0] as HTMLDivElement;
    expect(firstBar.getAttribute("aria-valuenow")).toBe("50");
    expect(firstBar.getAttribute("aria-valuetext")).toBe("250 / 500 XP (50%)");
    expect(firstBar.getAttribute("title")).toBe("250 / 500 XP (50%)");

    const secondBar = progressBars[1] as HTMLDivElement;
    expect(secondBar.getAttribute("aria-valuenow")).toBe("80");
    expect(secondBar.getAttribute("aria-valuetext")).toBe("1200 / 1500 XP (80%)");
    expect(secondBar.getAttribute("title")).toBe("1200 / 1500 XP (80%)");

    document.body.removeChild(container);
  });
});
