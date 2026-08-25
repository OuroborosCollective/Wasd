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
      level: 3,
      xp: 450,
      xpForNextLevel: 1000,
      progressRatio: 0.45,
    },
    {
      id: "mining",
      title: "Mining",
      level: 1,
      xp: 0,
      xpForNextLevel: 100,
      progressRatio: 0,
    },
  ];

  it("renders empty state with proper region landmark", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={[]} />);
    });

    const emptySection = container!.querySelector("[data-testid='skill-panel-empty']");
    expect(emptySection).toBeTruthy();
    expect(emptySection!.getAttribute("role")).toBe("region");
    expect(emptySection!.getAttribute("aria-label")).toBe("Skill Progression");
    expect(emptySection!.textContent).toContain("No live skill data yet.");
  });

  it("renders live skills with progressbars, aria-valuetext, and hover title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SkillProgressionPanel skills={mockSkills} />);
    });

    const liveSection = container!.querySelector("[data-testid='skill-panel-live']");
    expect(liveSection).toBeTruthy();
    expect(liveSection!.getAttribute("role")).toBe("region");
    expect(liveSection!.getAttribute("aria-label")).toBe("Skill Progression");

    // Check Woodcutting progressbar
    const woodBar = container!.querySelector("[data-testid='skill-progress-woodcutting'] [role='progressbar']");
    expect(woodBar).toBeTruthy();
    expect(woodBar!.getAttribute("aria-label")).toBe("Woodcutting progress to level 4");
    expect(woodBar!.getAttribute("aria-valuenow")).toBe("45");
    expect(woodBar!.getAttribute("aria-valuemin")).toBe("0");
    expect(woodBar!.getAttribute("aria-valuemax")).toBe("100");
    expect(woodBar!.getAttribute("aria-valuetext")).toBe("45% (450 / 1000 XP)");
    expect(woodBar!.getAttribute("title")).toBe("Woodcutting: 45% (450 / 1000 XP)");

    // Check Mining progressbar
    const mineBar = container!.querySelector("[data-testid='skill-progress-mining'] [role='progressbar']");
    expect(mineBar).toBeTruthy();
    expect(mineBar!.getAttribute("aria-label")).toBe("Mining progress to level 2");
    expect(mineBar!.getAttribute("aria-valuenow")).toBe("0");
    expect(mineBar!.getAttribute("aria-valuetext")).toBe("0% (0 / 100 XP)");
    expect(mineBar!.getAttribute("title")).toBe("Mining: 0% (0 / 100 XP)");
  });
});
