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

    expect(statusItems[0].textContent).toBe("Item collected");
    expect(statusItems[0].getAttribute("aria-live")).toBe("polite");
    expect(statusItems[0].getAttribute("aria-atomic")).toBe("true");

    expect(statusItems[1].textContent).toBe("Quest completed");
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

    expect(alertItems[0].textContent).toBe("Inventory full");
    expect(alertItems[0].getAttribute("aria-live")).toBe("assertive");
    expect(alertItems[0].getAttribute("aria-atomic")).toBe("true");

    expect(alertItems[1].textContent).toBe("Connection failed");
    expect(alertItems[1].getAttribute("aria-live")).toBe("assertive");
    expect(alertItems[1].getAttribute("aria-atomic")).toBe("true");
  });
});
