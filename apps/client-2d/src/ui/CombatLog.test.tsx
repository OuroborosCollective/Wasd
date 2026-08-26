/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CombatLog } from "./CombatLog";
import type { CombatLogEntry } from "../game/combat";

const mockEntries: CombatLogEntry[] = [
  {
    id: "c1",
    atTick: 10,
    text: "Damage 42",
    kind: "damage",
    atMs: 1000
  },
  {
    id: "c2",
    atTick: 12,
    text: "Heal 15",
    kind: "heal",
    atMs: 1200
  }
];

describe("CombatLog UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it("returns null when entries list is empty", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CombatLog entries={[]} />);
    });

    expect(container!.children.length).toBe(0);
  });

  it("renders container with WAI-ARIA live region attributes", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CombatLog entries={mockEntries} />);
    });

    const logContainer = container!.querySelector('[role="log"]');
    expect(logContainer).toBeTruthy();
    expect(logContainer?.getAttribute("aria-label")).toBe("Combat Log");
    expect(logContainer?.getAttribute("aria-live")).toBe("polite");
    expect(logContainer?.getAttribute("aria-relevant")).toBe("additions");
  });

  it("renders entries with role status, aria-label, and title tooltips", async () => {
    await act(async () => {
      const root = createRoot(container!);
      root.render(<CombatLog entries={mockEntries} />);
    });

    const statusItems = container!.querySelectorAll('[role="status"]');
    expect(statusItems.length).toBe(2);

    const firstItem = statusItems[0];
    expect(firstItem.textContent).toBe("Damage 42");
    expect(firstItem.getAttribute("aria-label")).toBe("Combat event: Damage 42");
    expect(firstItem.getAttribute("title")).toBe("Damage 42");

    const secondItem = statusItems[1];
    expect(secondItem.textContent).toBe("Heal 15");
    expect(secondItem.getAttribute("aria-label")).toBe("Combat event: Heal 15");
    expect(secondItem.getAttribute("title")).toBe("Heal 15");
  });
});
