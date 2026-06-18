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

export function SyncStateOverlay({ latestServerTick, renderTick }: SyncStateOverlayProps): JSX.Element | null {
  const state = classifySyncFreshness(latestServerTick, renderTick);
  if (state === "fresh") return null;

  return (
    <aside className={`sync-state-overlay sync-state-overlay--${state}`} aria-live="polite">
      {labelForState(state)}
    </aside>
  );
}
