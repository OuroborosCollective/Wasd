/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { BootSurface } from "./BootSurface";

describe("BootSurface UX & Accessibility", () => {
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

  it("renders children directly without diagnostic overlay in non-diagnostic states", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootSurface bootState="ready">
          <div data-testid="game-content">World Loaded</div>
        </BootSurface>
      );
    });

    const diagnostic = container!.querySelector("[data-testid='client-2d-boot-diagnostic']");
    expect(diagnostic).toBeNull();

    const content = container!.querySelector("[data-testid='game-content']");
    expect(content).toBeTruthy();
    expect(content!.textContent).toBe("World Loaded");
  });

  it("renders role='alertdialog' overlay with proper ARIA attributes in error state", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const testError = new Error("WebGL context lost");

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootSurface bootState="error" error={testError}>
          <div>World Content</div>
        </BootSurface>
      );
    });

    const overlay = container!.querySelector("[role='alertdialog']");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("aria-modal")).toBe("true");
    expect(overlay!.getAttribute("aria-labelledby")).toBe("boot-diagnostic-title");
    expect(overlay!.getAttribute("aria-describedby")).toBe("boot-diagnostic-desc");

    const title = container!.querySelector("#boot-diagnostic-title");
    expect(title).toBeTruthy();
    expect(title!.textContent).toContain("Areloria boot diagnostic");

    const emojiSpan = title!.querySelector("span[aria-hidden='true']");
    expect(emojiSpan).toBeTruthy();
    expect(emojiSpan!.textContent).toBe("🚨");

    const desc = container!.querySelector("#boot-diagnostic-desc");
    expect(desc).toBeTruthy();
    expect(desc!.getAttribute("aria-live")).toBe("polite");
    expect(desc!.textContent).toBe("The world renderer failed to start. The UI shell is still alive.");

    const pre = container!.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.getAttribute("tabIndex")).toBe("0");
    expect(pre!.getAttribute("aria-label")).toBe("Diagnostic error log and stack trace");
    expect(pre!.getAttribute("title")).toBe("Scroll to view error details");
    expect(pre!.textContent).toContain("Error: WebGL context lost");

    const buttons = container!.querySelectorAll("button");
    expect(buttons.length).toBe(2);

    const reloadBtn = buttons[0];
    expect(reloadBtn.getAttribute("aria-label")).toBe("Reload application page");
    expect(reloadBtn.getAttribute("title")).toBe("Reload page (F5)");

    const hardResetBtn = buttons[1];
    expect(hardResetBtn.getAttribute("aria-label")).toBe("Perform hard reset and reload application");
    expect(hardResetBtn.getAttribute("title")).toBe("Clear state and perform hard reload");
  });

  it("renders degraded mode state with warning icon and custom diagnostic message", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <BootSurface
          bootState="degraded"
          diagnosticMessage="Audio subsystem failed to initialize"
        >
          <div>World Content</div>
        </BootSurface>
      );
    });

    const overlay = container!.querySelector("[role='alertdialog']");
    expect(overlay).toBeTruthy();

    const title = container!.querySelector("#boot-diagnostic-title");
    const emojiSpan = title!.querySelector("span[aria-hidden='true']");
    expect(emojiSpan!.textContent).toBe("⚠️");

    const desc = container!.querySelector("#boot-diagnostic-desc");
    expect(desc!.textContent).toBe("Audio subsystem failed to initialize");
  });
});
