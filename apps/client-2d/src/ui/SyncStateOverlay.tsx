import type React from "react";
import { classifySyncFreshness, type SyncFreshnessState } from "../game/SnapshotRenderBuffer";

export interface SyncStateOverlayProps {
  readonly latestServerTick: number | null | undefined;
  readonly renderTick: number | null | undefined;
}

function labelForState(state: SyncFreshnessState): string {
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

function iconForState(state: SyncFreshnessState): string {
  switch (state) {
    case "waiting":
      return "⏳";
    case "fresh":
    case "stale_short":
      return "⚡";
    case "stale_medium":
      return "⚠️";
    case "stale_long":
      return "🛑";
  }
}

export function SyncStateOverlay({ latestServerTick, renderTick }: SyncStateOverlayProps): React.ReactElement | null {
  const state = classifySyncFreshness(latestServerTick, renderTick);
  if (state === "fresh") return null;

  const label = labelForState(state);
  const icon = iconForState(state);

  return (
    <aside
      className={`sync-state-overlay sync-state-overlay--${state}`}
      role="status"
      aria-live="polite"
      aria-label="Network Synchronization State"
      title={`Network Synchronization State: ${label}`}
    >
      <span aria-hidden="true" style={{ marginRight: "0.4rem" }}>
        {icon}
      </span>
      {label}
    </aside>
  );
}
