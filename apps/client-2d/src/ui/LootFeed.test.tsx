import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { LootFeed } from "./LootFeed";
import type { LootFeedEntry } from "../game/loot";

/**
 * @vitest-environment jsdom
 */

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("LootFeed", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    if (!globalThis.HTMLCanvasElement.prototype.getContext) {
      (globalThis.HTMLCanvasElement.prototype as any).getContext = () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => ([]),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 })
      });
    }
  });

  afterEach(() => {
    if (container) {
      act(() => {
        container?.remove();
      });
      container = null;
    }
  });

  it("renders null when entries array is empty", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container!).render(<LootFeed entries={[]} />);
    });

    expect(container.firstElementChild).toBeNull();
  });

  it("renders loot entries with correct ARIA attributes and title tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockEntries: LootFeedEntry[] = [
      {
        id: "loot-1",
        itemId: "health_potion_small",
        quantity: 2,
        timestamp: Date.now()
      },
      {
        id: "loot-2",
        itemId: "wood_sword",
        quantity: 1,
        timestamp: Date.now()
      }
    ];

    await act(async () => {
      createRoot(container!).render(<LootFeed entries={mockEntries} />);
    });

    const logFeed = container.querySelector('[role="log"]');
    expect(logFeed).not.toBeNull();
    expect(logFeed?.getAttribute("aria-label")).toBe("Loot Feed");
    expect(logFeed?.getAttribute("aria-live")).toBe("polite");

    const statusItems = container.querySelectorAll('[role="status"]');
    expect(statusItems.length).toBe(2);

    expect(statusItems[0].getAttribute("aria-label")).toBe(
      "Acquired 2 Small Health Potion (common)"
    );
    expect(statusItems[0].getAttribute("title")).toBe(
      "Small Health Potion (common) - Restores a small amount of health."
    );

    expect(statusItems[1].getAttribute("aria-label")).toBe(
      "Acquired 1 Wood Sword (common)"
    );
    expect(statusItems[1].getAttribute("title")).toBe(
      "Wood Sword (common) - A simple starter blade."
    );
  });
});
