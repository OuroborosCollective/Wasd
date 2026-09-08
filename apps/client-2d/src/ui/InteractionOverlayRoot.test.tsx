/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { InteractionOverlayRoot } from "./InteractionOverlayRoot";
import { interactionUI } from "./UIManager";

describe("InteractionOverlayRoot UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    interactionUI.closeUI();
    vi.restoreAllMocks();
  });

  it("renders overlay when active and handles close button click and Escape key", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InteractionOverlayRoot />);
    });

    // Initially overlay is NONE, so overlay root is not present
    expect(container!.querySelector('.interaction-overlay-root')).toBeNull();

    // Open trade overlay
    await act(async () => {
      interactionUI.openTrade({
        targetId: 'vendor-1',
        vendorManifest: 'millbrook_starter_vendor',
      });
    });

    const overlayRoot = container!.querySelector('.interaction-overlay-root');
    expect(overlayRoot).toBeTruthy();

    const dialog = container!.querySelector('section[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');

    // Close button attributes
    const closeBtn = container!.querySelector('button.interaction-close');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn!.getAttribute('aria-label')).toBe('Close interaction [ESC]');
    expect(closeBtn!.getAttribute('title')).toBe('Close interaction [ESC]');
    expect(closeBtn!.getAttribute('aria-keyshortcuts')).toBe('Escape');

    // Test Escape keydown closes the UI
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container!.querySelector('.interaction-overlay-root')).toBeNull();
  });

  it("closes overlay when clicking header close button", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<InteractionOverlayRoot />);
    });

    await act(async () => {
      interactionUI.openTrade({
        targetId: 'vendor-1',
        vendorManifest: 'millbrook_starter_vendor',
      });
    });

    const closeBtn = container!.querySelector('button.interaction-close') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(container!.querySelector('.interaction-overlay-root')).toBeNull();
  });
});
