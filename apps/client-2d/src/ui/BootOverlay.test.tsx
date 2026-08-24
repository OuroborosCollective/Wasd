/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { BootOverlay } from "./BootOverlay";
import { BOOT_PHASES } from "../theme/designTokens";

describe("BootOverlay UX & Accessibility", () => {
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

  it("renders with proper WAI-ARIA region and live status attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootOverlay
          phase={BOOT_PHASES.BOOTING}
          message="Booting system modules..."
        />
      );
    });

    const region = container!.querySelector("[role='region']");
    expect(region).toBeTruthy();
    expect(region!.getAttribute("aria-label")).toBe("Initialization Boot Overlay");

    const liveMessage = container!.querySelector("p[aria-live='polite']");
    expect(liveMessage).toBeTruthy();
    expect(liveMessage!.textContent).toBe("Booting system modules...");
  });

  it("renders WAI-ARIA progressbar with calculated phase progress", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootOverlay
          phase={BOOT_PHASES.LOADING_ASSETS}
          message="Loading game assets..."
        />
      );
    });

    const progressbar = container!.querySelector("[role='progressbar']");
    expect(progressbar).toBeTruthy();
    expect(progressbar!.getAttribute("aria-label")).toBe("Boot initialization progress");
    expect(progressbar!.getAttribute("aria-valuenow")).toBe("55");
    expect(progressbar!.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar!.getAttribute("aria-valuemax")).toBe("100");
    expect(progressbar!.getAttribute("aria-valuetext")).toBe(`55% - ${BOOT_PHASES.LOADING_ASSETS}`);
  });

  it("supports explicit progress override and displays fatal message when present", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootOverlay
          phase={BOOT_PHASES.FATAL}
          message="Standard loading error"
          fatal="Critical WebGL context loss"
          progress={100}
        />
      );
    });

    const liveMessage = container!.querySelector("p[aria-live='polite']");
    expect(liveMessage!.textContent).toBe("Critical WebGL context loss");

    const progressbar = container!.querySelector("[role='progressbar']");
    expect(progressbar!.getAttribute("aria-valuenow")).toBe("100");
    expect(progressbar!.getAttribute("aria-valuetext")).toBe(`100% - ${BOOT_PHASES.FATAL}`);
  });
});
