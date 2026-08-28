/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NetworkQualityHud } from "./NetworkQualityHud";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("NetworkQualityHud UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    if (!globalThis.HTMLCanvasElement.prototype.getContext) {
      (globalThis.HTMLCanvasElement.prototype as any).getContext = () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => [],
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

  it("renders with landmark role, aria-label, aria-live, and title tooltip", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container!).render(
        <NetworkQualityHud
          rttMs={42}
          quality="good"
          pendingInputs={0}
          lastSequenceId={120}
          acknowledgedInputSeq={120}
          serverTick={500}
          serverOffsetMs={10}
        />
      );
    });

    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-label")).toBe("Network Performance Monitor");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("aria-atomic")).toBe("true");
    expect(region?.getAttribute("title")).toBe("Network Status: GOOD (42ms RTT)");
    expect(container.textContent).toContain("NET GOOD");
    expect(container.textContent).toContain("rtt: 42ms");
  });
});
