/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { TradeOverlay } from "./TradeOverlay";
import type { ActiveOverlay } from "./UIManager";

describe("TradeOverlay UX & Accessibility", () => {
  let container: HTMLDivElement | null = null;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.restoreAllMocks();
  });

  const mockPayload: Extract<ActiveOverlay, { type: 'TRADE' }> = {
    type: 'TRADE',
    targetId: 'vendor-1',
    vendorManifest: 'millbrook_starter_vendor'
  };

  it("renders container with region role and aria-label", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<TradeOverlay payload={mockPayload} />);
    });

    const region = container!.querySelector('.trade-overlay');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('role')).toBe('region');
    expect(region!.getAttribute('aria-label')).toBe('Trade Offer');
  });

  it("renders purchase button with proper initial ARIA attributes and tooltips", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<TradeOverlay payload={mockPayload} />);
    });

    const button = container!.querySelector('button');
    expect(button).toBeTruthy();
    expect(button!.textContent?.trim()).toBe('10 Silver');
    expect(button!.getAttribute('aria-busy')).toBe('false');
    expect(button!.getAttribute('aria-label')).toBe('Buy Starter Rations for 10 Silver');
    expect(button!.getAttribute('title')).toBe('Buy Starter Rations for 10 Silver');
    expect(button!.disabled).toBe(false);
  });

  it("handles purchase click, updates button state to Buying..., and shows live status alert", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const clientActionSpy = vi.fn();
    const handleClientAction = (e: Event) => {
      clientActionSpy((e as CustomEvent).detail);
    };
    window.addEventListener('wasd:client-action', handleClientAction);

    await act(async () => {
      const root = createRoot(container!);
      root.render(<TradeOverlay payload={mockPayload} />);
    });

    const button = container!.querySelector('button');
    expect(button).toBeTruthy();

    await act(async () => {
      button!.click();
    });

    // Verify custom event payload
    expect(clientActionSpy).toHaveBeenCalledWith({
      action: 'BUY_VENDOR_ITEM',
      payload: {
        targetId: 'vendor-1',
        vendorManifest: 'millbrook_starter_vendor',
        itemId: 'item_ration_5',
        quantity: 1,
      }
    });

    // Verify state updates during processing
    expect(button!.disabled).toBe(true);
    expect(button!.textContent?.trim()).toBe('Buying...');
    expect(button!.getAttribute('aria-busy')).toBe('true');
    expect(button!.getAttribute('aria-label')).toBe('Purchasing Starter Rations...');
    expect(button!.getAttribute('title')).toBe('Purchasing Starter Rations...');

    // Verify accessible live status element
    const statusMsg = container!.querySelector('.trade-processing');
    expect(statusMsg).toBeTruthy();
    expect(statusMsg!.getAttribute('role')).toBe('status');
    expect(statusMsg!.getAttribute('aria-live')).toBe('polite');
    expect(statusMsg!.textContent).toContain('Validating transaction …');

    // Simulate completion packet reset
    await act(async () => {
      window.dispatchEvent(new CustomEvent('wasd:network-packet', {
        detail: { event: 'TRANSACTION_COMPLETE' }
      }));
    });

    expect(button!.disabled).toBe(false);
    expect(button!.textContent?.trim()).toBe('10 Silver');
    expect(container!.querySelector('.trade-processing')).toBeNull();

    window.removeEventListener('wasd:client-action', handleClientAction);
  });
});
