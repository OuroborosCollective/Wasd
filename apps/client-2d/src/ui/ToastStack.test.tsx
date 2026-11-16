import { describe, it, expect, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ToastStack, type ClientToast } from "./ToastStack";

/**
 * @vitest-environment jsdom
 */

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("ToastStack", () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container) {
      act(() => {
        container?.remove();
      });
      container = null;
    }
  });

  it("renders container region with proper ARIA attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container!).render(<ToastStack toasts={[]} />);
    });

    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-label")).toBe("Notifications");
  });

  it("renders status messages for info and success toasts with polite aria-live", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const toasts: ClientToast[] = [
      {
        id: "1",
        message: "Item collected",
        severity: "info",
        createdAtMs: Date.now()
      },
      {
        id: "2",
        message: "Quest completed",
        severity: "success",
        createdAtMs: Date.now()
      }
    ];

    await act(async () => {
      createRoot(container!).render(<ToastStack toasts={toasts} />);
    });

    const statusItems = container.querySelectorAll('[role="status"]');
    expect(statusItems.length).toBe(2);

    expect(statusItems[0].textContent).toContain("Item collected");
    expect(statusItems[0].getAttribute("aria-live")).toBe("polite");
    expect(statusItems[0].getAttribute("aria-atomic")).toBe("true");

    expect(statusItems[1].textContent).toContain("Quest completed");
    expect(statusItems[1].getAttribute("aria-live")).toBe("polite");
    expect(statusItems[1].getAttribute("aria-atomic")).toBe("true");
  });

  it("renders alert messages for warning and error toasts with assertive aria-live", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const toasts: ClientToast[] = [
      {
        id: "3",
        message: "Inventory full",
        severity: "warning",
        createdAtMs: Date.now()
      },
      {
        id: "4",
        message: "Connection failed",
        severity: "error",
        createdAtMs: Date.now()
      }
    ];

    await act(async () => {
      createRoot(container!).render(<ToastStack toasts={toasts} />);
    });

    const alertItems = container.querySelectorAll('[role="alert"]');
    expect(alertItems.length).toBe(2);

    expect(alertItems[0].textContent).toContain("Inventory full");
    expect(alertItems[0].getAttribute("aria-live")).toBe("assertive");
    expect(alertItems[0].getAttribute("aria-atomic")).toBe("true");

    expect(alertItems[1].textContent).toContain("Connection failed");
    expect(alertItems[1].getAttribute("aria-live")).toBe("assertive");
    expect(alertItems[1].getAttribute("aria-atomic")).toBe("true");
  });

  it("renders visual severity category icons wrapped with aria-hidden='true'", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const toasts: ClientToast[] = [
      { id: "1", message: "Success msg", severity: "success", createdAtMs: Date.now() },
      { id: "2", message: "Warning msg", severity: "warning", createdAtMs: Date.now() },
      { id: "3", message: "Error msg", severity: "error", createdAtMs: Date.now() },
      { id: "4", message: "Info msg", severity: "info", createdAtMs: Date.now() }
    ];

    await act(async () => {
      createRoot(container!).render(<ToastStack toasts={toasts} />);
    });

    const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBe(4);
    expect(hiddenIcons[0].textContent).toBe("✅");
    expect(hiddenIcons[1].textContent).toBe("⚠️");
    expect(hiddenIcons[2].textContent).toBe("⛔");
    expect(hiddenIcons[3].textContent).toBe("ℹ️");
  });
});
