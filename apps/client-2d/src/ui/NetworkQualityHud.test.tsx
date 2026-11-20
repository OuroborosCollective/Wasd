/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NetworkQualityHud } from "./NetworkQualityHud";

describe("NetworkQualityHud", () => {
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

  const defaultProps = {
    rttMs: 42,
    quality: "good" as const,
    pendingInputs: 0,
    lastSequenceId: 105,
    acknowledgedInputSeq: 105,
    serverTick: 1200,
    serverOffsetMs: 5
  };

  it("renders with status region attributes for accessibility", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<NetworkQualityHud {...defaultProps} />);
    });

    const statusElement = container!.querySelector('[role="status"]');
    expect(statusElement).toBeTruthy();
    expect(statusElement!.getAttribute("aria-live")).toBe("polite");
    expect(statusElement!.getAttribute("aria-label")).toBe("Network Quality Diagnostics");
  });

  it("displays quality label and visual indicator icon for good quality", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<NetworkQualityHud {...defaultProps} quality="good" />);
    });

    expect(container!.textContent).toContain("NET GOOD");
    expect(container!.textContent).toContain("🟢");
  });

  it("displays correct visual icon and label across different quality states", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container!);

    await act(async () => {
      root.render(<NetworkQualityHud {...defaultProps} quality="ok" />);
    });
    expect(container!.textContent).toContain("NET OK");
    expect(container!.textContent).toContain("🟡");

    await act(async () => {
      root.render(<NetworkQualityHud {...defaultProps} quality="poor" />);
    });
    expect(container!.textContent).toContain("NET POOR");
    expect(container!.textContent).toContain("🟠");

    await act(async () => {
      root.render(<NetworkQualityHud {...defaultProps} quality="offline" />);
    });
    expect(container!.textContent).toContain("NET OFFLINE");
    expect(container!.textContent).toContain("🔴");
  });

  it("renders network diagnostic metrics correctly", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<NetworkQualityHud {...defaultProps} />);
    });

    expect(container!.textContent).toContain("rtt: 42ms");
    expect(container!.textContent).toContain("pending: 0");
    expect(container!.textContent).toContain("seq: 105");
    expect(container!.textContent).toContain("ack: 105");
    expect(container!.textContent).toContain("serverTick: 1200");
    expect(container!.textContent).toContain("offset: 5ms");
  });
});
