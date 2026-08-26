/**
 * Sync State Overlay - DOM-based rendering of sync state
 *
 * Handles stale-state overlays and Causal Catchup display.
 * ARE-Rules: No fake state, no local mutations, server-authoritative only.
 */

import type { CausalCatchupSummaryPayload } from "../net/protocol";
import { isCausalCatchupSummaryPayload } from "../net/protocol";
import type { SyncFreshnessState } from "./SnapshotRenderBuffer";

const OVERLAY_ID = "areloria-sync-state-overlay";
const CAUSAL_OVERLAY_ID = "areloria-causal-catchup-overlay";

export interface SyncStateOverlayRenderState {
  readonly label: string;
  readonly eventCount: number;
  readonly firstTick: number | null;
  readonly lastTick: number | null;
  readonly summaryHash: string;
  readonly sideChannelOnly: true;
}

/**
 * Create a render state from CausalCatchupSummary payload.
 * Safely validates input - no fake fallback.
 */
export function createSyncStateOverlayState(
  summary: unknown,
): SyncStateOverlayRenderState | null {
  if (!isCausalCatchupSummaryPayload(summary)) {
    return null;
  }

  return Object.freeze({
    label: summary.eventCount > 0 ? "Causal catchup observed" : "Causal catchup idle",
    eventCount: summary.eventCount,
    firstTick: summary.firstTick,
    lastTick: summary.lastTick,
    summaryHash: summary.summaryHash,
    sideChannelOnly: true,
  });
}

/**
 * Get human-readable label for sync freshness state.
 */
export function labelForSyncState(state: SyncFreshnessState): string {
  switch (state) {
    case "waiting":
      return "Waiting for server snapshot";
    case "fresh":
      return "Live";
    case "stale_short":
      return "Network delay";
    case "stale_medium":
      return "Snapshot is stale";
    case "stale_long":
      return "Resync required";
  }
}

/**
 * Escape HTML entities to prevent injection from snapshot fields.
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render the sync state overlay with given freshness state.
 * Returns null if state is 'fresh' (no overlay needed).
 */
export function renderSyncStateOverlay(
  state: SyncFreshnessState,
  root: Document = document,
): HTMLElement | null {
  // Fresh state doesn't need overlay
  if (state === "fresh") {
    const existing = root.getElementById(OVERLAY_ID);
    existing?.remove();
    return null;
  }

  const label = labelForSyncState(state);
  let overlay = root.getElementById(OVERLAY_ID);

  if (!overlay) {
    overlay = root.createElement("aside");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-live", "polite");
    overlay.style.position = "fixed";
    overlay.style.right = "12px";
    overlay.style.bottom = "12px";
    overlay.style.zIndex = "30";
    overlay.style.pointerEvents = "none";
    overlay.style.padding = "8px 10px";
    overlay.style.borderRadius = "8px";
    overlay.style.background = "rgba(2, 6, 23, 0.76)";
    overlay.style.color = "#dbeafe";
    overlay.style.font = "12px/1.35 system-ui, sans-serif";
    overlay.style.maxWidth = "260px";
    overlay.className = `sync-state-overlay sync-state-overlay--${state}`;
    root.body.appendChild(overlay);
  }

  // Update class for state-specific styling
  overlay.className = `sync-state-overlay sync-state-overlay--${state}`;
  overlay.textContent = label;

  return overlay;
}

/**
 * Render causal catchup overlay from validated payload.
 * Returns null if payload is invalid or not side-channel-only.
 */
export function renderCausalCatchupOverlay(
  summary: unknown,
  root: Document = document,
): HTMLElement | null {
  const state = createSyncStateOverlayState(summary);
  if (!state) return null;

  // Only render if sideChannelOnly is true
  if (summary && typeof summary === "object" && (summary as { sideChannelOnly?: unknown }).sideChannelOnly !== true) {
    return null;
  }

  let overlay = root.getElementById(CAUSAL_OVERLAY_ID);

  if (!overlay) {
    overlay = root.createElement("aside");
    overlay.id = CAUSAL_OVERLAY_ID;
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("data-side-channel-only", "true");
    overlay.style.position = "fixed";
    overlay.style.right = "12px";
    overlay.style.bottom = "60px";
    overlay.style.zIndex = "30";
    overlay.style.pointerEvents = "none";
    overlay.style.padding = "8px 10px";
    overlay.style.borderRadius = "8px";
    overlay.style.background = "rgba(2, 6, 23, 0.76)";
    overlay.style.color = "#dbeafe";
    overlay.style.font = "12px/1.35 system-ui, sans-serif";
    overlay.style.maxWidth = "260px";
    root.body.appendChild(overlay);
  }

  // Safe text rendering with escaped hash
  const tickRange = state.firstTick === null || state.lastTick === null
    ? "no events"
    : `ticks ${state.firstTick}-${state.lastTick}`;

  const safeLabel = escapeHtml(state.label);
  const safeHash = escapeHtml(state.summaryHash);

  overlay.textContent = "";
  overlay.textContent = `${safeLabel}: ${state.eventCount} event(s), ${tickRange}, hash ${safeHash}`;

  overlay.dataset.sideChannelOnly = "true";
  overlay.dataset.eventCount = String(state.eventCount);
  overlay.dataset.summaryHash = state.summaryHash;

  return overlay;
}

/**
 * Remove the sync state overlay from DOM.
 */
export function removeSyncStateOverlay(root: Document = document): void {
  root.getElementById(OVERLAY_ID)?.remove();
  root.getElementById(CAUSAL_OVERLAY_ID)?.remove();
}
