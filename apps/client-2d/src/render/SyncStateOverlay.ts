import type { CausalCatchupSummaryPayload } from "../net/protocol";

const OVERLAY_ID = "areloria-sync-state-overlay";

export interface SyncStateOverlayRenderState {
  readonly label: string;
  readonly eventCount: number;
  readonly firstTick: number | null;
  readonly lastTick: number | null;
  readonly summaryHash: string;
  readonly sideChannelOnly: true;
}

export function createSyncStateOverlayState(summary: CausalCatchupSummaryPayload): SyncStateOverlayRenderState {
  return Object.freeze({
    label: summary.eventCount > 0 ? "Causal catchup observed" : "Causal catchup idle",
    eventCount: summary.eventCount,
    firstTick: summary.firstTick,
    lastTick: summary.lastTick,
    summaryHash: summary.summaryHash,
    sideChannelOnly: true,
  });
}

export function renderSyncStateOverlay(summary: CausalCatchupSummaryPayload, root: Document = document): HTMLElement | null {
  if (summary.sideChannelOnly !== true) return null;

  const state = createSyncStateOverlayState(summary);
  let overlay = root.getElementById(OVERLAY_ID);

  if (!overlay) {
    overlay = root.createElement("aside");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("data-side-channel-only", "true");
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
    root.body.appendChild(overlay);
  }

  const tickRange = state.firstTick === null || state.lastTick === null
    ? "no events"
    : `ticks ${state.firstTick}-${state.lastTick}`;

  overlay.textContent = `${state.label}: ${state.eventCount} event(s), ${tickRange}, hash ${state.summaryHash}`;
  overlay.dataset.sideChannelOnly = "true";
  overlay.dataset.eventCount = String(state.eventCount);
  overlay.dataset.summaryHash = state.summaryHash;

  return overlay;
}
