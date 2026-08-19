/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MobileActionBar } from "./MobileActionBar";
import { createSkillStates } from "../game/skills";

describe("MobileActionBar UX & Accessibility", () => {
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

  it("renders container toolbar with proper ARIA attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const skills = createSkillStates();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <MobileActionBar
          skills={skills}
          onSkill={() => {}}
          onInventory={() => {}}
          onQuest={() => {}}
          onEquipment={() => {}}
        />
      );
    });

    const toolbar = container!.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar!.getAttribute("aria-label")).toBe("Mobile action controls");
  });

  it("renders skill action buttons with dynamic ARIA labels and title tooltips for cooldowns", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const skills = createSkillStates();
    // Put primary skill on cooldown (e.g. 3 ticks remaining)
    skills.primary.cooldownRemainingTicks = 3;

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <MobileActionBar
          skills={skills}
          onSkill={() => {}}
          onInventory={() => {}}
          onQuest={() => {}}
          onEquipment={() => {}}
        />
      );
    });

    const primaryBtn = container!.querySelector(
      'button[aria-label="Hit skill (Cooldown 3 ticks)"]'
    ) as HTMLButtonElement;
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.disabled).toBe(true);
    expect(primaryBtn.getAttribute("title")).toBe("Hit (Cooldown: 3 ticks)");

    const impactBtn = container!.querySelector(
      'button[aria-label="Impact skill"]'
    ) as HTMLButtonElement;
    expect(impactBtn).toBeTruthy();
    expect(impactBtn.disabled).toBe(false);
    expect(impactBtn.getAttribute("title")).toBe("Impact");
  });

  it("renders utility panel buttons with proper ARIA labels, tooltips, and shortcut keys", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const skills = createSkillStates();
    const handleInventory = vi.fn();
    const handleEquipment = vi.fn();
    const handleQuest = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <MobileActionBar
          skills={skills}
          onSkill={() => {}}
          onInventory={handleInventory}
          onQuest={handleQuest}
          onEquipment={handleEquipment}
        />
      );
    });

    const invBtn = container!.querySelector('button[aria-label="Open Inventory"]');
    expect(invBtn).toBeTruthy();
    expect(invBtn!.getAttribute("title")).toBe("Open Inventory (I)");
    expect(invBtn!.getAttribute("aria-keyshortcuts")).toBe("i");

    const eqBtn = container!.querySelector('button[aria-label="Open Equipment"]');
    expect(eqBtn).toBeTruthy();
    expect(eqBtn!.getAttribute("title")).toBe("Open Equipment (E)");
    expect(eqBtn!.getAttribute("aria-keyshortcuts")).toBe("e");

    const questBtn = container!.querySelector('button[aria-label="Open Quests"]');
    expect(questBtn).toBeTruthy();
    expect(questBtn!.getAttribute("title")).toBe("Open Quests (Q)");
    expect(questBtn!.getAttribute("aria-keyshortcuts")).toBe("q");

    await act(async () => {
      (invBtn as HTMLButtonElement).click();
      (eqBtn as HTMLButtonElement).click();
      (questBtn as HTMLButtonElement).click();
    });

    expect(handleInventory).toHaveBeenCalledTimes(1);
    expect(handleEquipment).toHaveBeenCalledTimes(1);
    expect(handleQuest).toHaveBeenCalledTimes(1);
  });
});
