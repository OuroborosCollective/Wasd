/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { PaperdollPanel } from "./PaperdollPanel";
import type { PaperdollSnapshot } from "../../game/liveGameplaySnapshot";

describe("PaperdollPanel UX & Accessibility", () => {
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

  it("renders container with region landmark role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: PaperdollSnapshot = {
      character: {
        displayName: "Valerius",
        archetype: "Wanderer",
      },
      slots: [
        { slotId: "weapon", itemId: "iron_sword", title: "Iron Sword" },
        { slotId: "helmet", itemId: null, title: "Empty" },
      ],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<PaperdollPanel paperdoll={mockSnapshot} />);
    });

    const section = container!.querySelector("section");
    expect(section).toBeTruthy();
    expect(section!.getAttribute("role")).toBe("region");
    expect(section!.getAttribute("aria-label")).toBe("Character Equipment Paperdoll");
  });

  it("renders character profile and empty slots fallback", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const emptySnapshot: PaperdollSnapshot = {
      character: null,
      slots: [],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<PaperdollPanel paperdoll={emptySnapshot} />);
    });

    expect(container!.textContent).toContain("No character selected.");
  });

  it("renders slots with descriptive aria-label and matching hover title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockSnapshot: PaperdollSnapshot = {
      character: {
        displayName: "Valerius",
        archetype: "Wanderer",
      },
      slots: [
        { slotId: "weapon", itemId: "iron_sword", title: "Iron Sword" },
        { slotId: "mining_tool", itemId: "copper_pickaxe", title: "Copper Pickaxe" },
      ],
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(<PaperdollPanel paperdoll={mockSnapshot} />);
    });

    const slots = container!.querySelectorAll("article.paperdoll-slot");
    expect(slots.length).toBe(2);

    expect(slots[0].getAttribute("aria-label")).toBe("Weapon: Iron Sword");
    expect(slots[0].getAttribute("title")).toBe("Weapon: Iron Sword");

    expect(slots[1].getAttribute("aria-label")).toBe("Mining: Copper Pickaxe");
    expect(slots[1].getAttribute("title")).toBe("Mining: Copper Pickaxe");
  });
});
