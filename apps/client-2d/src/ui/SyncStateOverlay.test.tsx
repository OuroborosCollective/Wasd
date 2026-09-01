/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SyncStateOverlay } from "./SyncStateOverlay";

describe("SyncStateOverlay UX & Accessibility", () => {
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

  it("returns null when sync state is fresh", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SyncStateOverlay latestServerTick={100} renderTick={100} />);
    });

    expect(container!.children.length).toBe(0);
    expect(container!.textContent).toBe("");
  });

  it("renders status overlay with proper ARIA attributes and title tooltip when waiting for snapshot", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SyncStateOverlay latestServerTick={null} renderTick={null} />);
    });

    const overlay = container!.querySelector(".sync-state-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toBe("Waiting for server snapshot");
    expect(overlay!.getAttribute("role")).toBe("status");
    expect(overlay!.getAttribute("aria-live")).toBe("polite");
    expect(overlay!.getAttribute("aria-label")).toBe("Network Synchronization State");
    expect(overlay!.getAttribute("title")).toBe("Network Synchronization State: Waiting for server snapshot");
  });

  it("renders status overlay when snapshot is stale", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<SyncStateOverlay latestServerTick={50} renderTick={100} />);
    });

    const overlay = container!.querySelector(".sync-state-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toBe("Resync required");
    expect(overlay!.getAttribute("title")).toBe("Network Synchronization State: Resync required");
  });
});
