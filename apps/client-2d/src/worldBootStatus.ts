import type { Live2DRuntimeSnapshot } from "./LiveAuthoritativeWorld2D";

export type WorldBootStatus =
  | "mounting"
  | "connecting"
  | "world_projection_ready"
  | "world_ready"
  | "failed";

/**
 * Derives an observable client boot state from live runtime evidence only.
 * It never creates world state and must not be used as gameplay authority.
 */
export function deriveWorldBootStatus(
  runtime: Live2DRuntimeSnapshot,
  liveNetworkStatus: string | null | undefined,
  liveServerTick: number | null | undefined,
): WorldBootStatus {
  if (runtime.phase === "failed" || runtime.rendererStatus === "failed" || runtime.error) {
    return "failed";
  }

  const connected = runtime.connected || liveNetworkStatus === "connected";
  const serverTick = liveServerTick ?? runtime.serverTick;
  const hasServerTick = typeof serverTick === "number" && Number.isFinite(serverTick) && serverTick >= 0;
  const worldProjectionReady = runtime.worldProjectionReady === true;
  const rendererReady = runtime.phase === "ready" && runtime.rendererStatus === "ready";

  if (rendererReady && worldProjectionReady && connected && hasServerTick) {
    return "world_ready";
  }
  if (rendererReady && worldProjectionReady) {
    return "world_projection_ready";
  }
  if (runtime.phase === "connecting" || connected) {
    return "connecting";
  }
  return "mounting";
}
