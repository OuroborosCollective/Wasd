/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { WorldLoadingScreen } from "./WorldLoadingScreen";

describe("WorldLoadingScreen UX & Accessibility", () => {
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

  it("renders with status landmark, polite aria-live, and progressbar when loading", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <WorldLoadingScreen
          status="loading"
          progress={45}
          worldName="ARELORIA"
        />
      );
    });

    const screen = container!.querySelector(".world-loading-screen");
    expect(screen).toBeTruthy();
    expect(screen?.getAttribute("role")).toBe("status");
    expect(screen?.getAttribute("aria-live")).toBe("polite");
    expect(screen?.getAttribute("aria-label")).toBe("ARELORIA - LOADING");

    const progressbar = container!.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
    expect(progressbar?.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar?.getAttribute("aria-valuemax")).toBe("100");
    expect(progressbar?.getAttribute("aria-label")).toBe("ARELORIA loading progress");
  });

  it("renders alert landmark when in error status with error message", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <WorldLoadingScreen
          status="error"
          errorMessage="Failed to connect to gateway"
          worldName="ARELORIA"
        />
      );
    });

    const alert = container!.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toBe("Failed to connect to gateway");

    // Check no progress bar rendered in error state
    const progressbar = container!.querySelector('[role="progressbar"]');
    expect(progressbar).toBeNull();
  });

  it("renders online heartbeat with aria-hidden on decorative elements", async () => {
    const onReadyMock = vi.fn();

    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <WorldLoadingScreen
          status="online"
          worldName="ARELORIA"
          onReady={onReadyMock}
        />
      );
    });

    expect(onReadyMock).toHaveBeenCalledTimes(1);

    const screen = container!.querySelector(".world-loading-screen");
    expect(screen?.getAttribute("aria-label")).toBe("ARELORIA - ONLINE");

    // Verify decorative geometric icon has aria-hidden
    const decorativeElements = container!.querySelectorAll('[aria-hidden="true"]');
    expect(decorativeElements.length).toBeGreaterThan(0);
  });
});
