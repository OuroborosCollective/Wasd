/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ToastStack, type ClientToast } from "./ToastStack";

describe("ToastStack Accessibility", () => {
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

  it("renders a polite live log container with correct aria attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockToasts: ClientToast[] = [
      {
        id: "toast-1",
        message: "Loot secured!",
        severity: "success",
        createdAtMs: Date.now()
      },
      {
        id: "toast-2",
        message: "Aether energy low",
        severity: "warning",
        createdAtMs: Date.now()
      }
    ];

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ToastStack toasts={mockToasts} />);
    });

    const wrapper = container!.firstElementChild;
    expect(wrapper).toBeTruthy();
    expect(wrapper!.getAttribute("role")).toBe("log");
    expect(wrapper!.getAttribute("aria-live")).toBe("polite");
    expect(wrapper!.getAttribute("aria-label")).toBe("System notifications");
  });

  it("assigns appropriate roles and live regions based on severity", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const mockToasts: ClientToast[] = [
      {
        id: "toast-success",
        message: "Action successful",
        severity: "success",
        createdAtMs: Date.now()
      },
      {
        id: "toast-error",
        message: "Connection failed",
        severity: "error",
        createdAtMs: Date.now()
      }
    ];

    await act(async () => {
      const root = createRoot(container!);
      root.render(<ToastStack toasts={mockToasts} />);
    });

    const successToast = container!.querySelector('[role="status"]');
    expect(successToast).toBeTruthy();
    expect(successToast!.getAttribute("aria-live")).toBe("polite");
    expect(successToast!.textContent).toBe("Action successful");

    const errorToast = container!.querySelector('[role="alert"]');
    expect(errorToast).toBeTruthy();
    expect(errorToast!.getAttribute("aria-live")).toBe("assertive");
    expect(errorToast!.textContent).toBe("Connection failed");
  });
});
