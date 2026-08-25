/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { IdentityDebugPanel } from "./IdentityDebugPanel";

describe("IdentityDebugPanel Accessibility & Interaction", () => {
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
    open: true,
    stableGuestId: "guest-12345678",
    sessionToken: "token-87654321",
    playerId: "player-11223344",
    characterId: "char-55667788",
    identityStatus: "authenticated",
    onResetIdentity: vi.fn(),
    onClose: vi.fn()
  };

  it("renders modal dialog semantics and aria attributes when open", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<IdentityDebugPanel {...defaultProps} />);
    });

    const dialog = container!.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-labelledby")).toBe("identity-debug-title");

    const title = container!.querySelector("#identity-debug-title");
    expect(title).toBeTruthy();
    expect(title!.textContent?.trim()).toBe("Identity Debug [P7]");
  });

  it("renders accessible close button and handles click", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<IdentityDebugPanel {...defaultProps} onClose={onClose} />);
    });

    const closeBtn = container!.querySelector('button[aria-label="Close identity debug panel"]');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn!.getAttribute("title")).toBe("Close identity debug panel");

    await act(async () => {
      (closeBtn as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders accessible reset button with tooltip title and handles click", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onResetIdentity = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<IdentityDebugPanel {...defaultProps} onResetIdentity={onResetIdentity} />);
    });

    const resetBtn = container!.querySelector('button[aria-label="Reset local identity"]');
    expect(resetBtn).toBeTruthy();
    expect(resetBtn!.getAttribute("title")).toBe("Reset local guest identity and clear credentials");

    await act(async () => {
      (resetBtn as HTMLButtonElement).click();
    });

    expect(onResetIdentity).toHaveBeenCalledTimes(1);
  });

  it("dismisses panel when Escape key is pressed", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const onClose = vi.fn();

    await act(async () => {
      const root = createRoot(container!);
      root.render(<IdentityDebugPanel {...defaultProps} onClose={onClose} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when open is false", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<IdentityDebugPanel {...defaultProps} open={false} />);
    });

    expect(container!.children.length).toBe(0);
    expect(container!.textContent).toBe("");
  });
});
