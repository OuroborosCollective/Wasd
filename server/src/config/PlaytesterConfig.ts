type BoolFallback = boolean;

function envFlag(key: string, fallback: BoolFallback): boolean {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function envInt(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

function envString(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const PlaytesterConfig = {
  enabled: envFlag("PLAYTESTER_ENABLED", false),
  id: envString("PLAYTESTER_ID", "playtester_001"),
  displayName: envString("PLAYTESTER_DISPLAY_NAME", "Playtester Bot"),
  syntheticSocketId: envString("PLAYTESTER_SOCKET_ID", "playtester_socket_001"),
  tickMs: envInt("PLAYTESTER_TICK_MS", 500, 100, 5000),
  logEnabled: envFlag("PLAYTESTER_LOG_ENABLED", true),
  streamEnabled: envFlag("PLAYTESTER_STREAM_ENABLED", true),
  maxEventsInMemory: envInt("PLAYTESTER_MAX_EVENTS_IN_MEMORY", 50, 10, 500),
  debugLogPath: envString("PLAYTESTER_DEBUG_LOG_PATH", "data/logs/playtester-debug.jsonl"),
  monitorPath: envString("PLAYTESTER_MONITOR_PATH", "/playtester-monitor"),
  monitorToken: (() => {
    const raw = process.env.PLAYTESTER_MONITOR_TOKEN;
    if (typeof raw !== "string") return "";
    return raw.trim();
  })(),
  monitorDefaultRadiusChunks: envInt("PLAYTESTER_MONITOR_RADIUS_CHUNKS", 2, 1, 8),
  monitorPerformanceRadiusChunks: envInt("PLAYTESTER_MONITOR_PERF_RADIUS_CHUNKS", 1, 1, 4),
} as const;

export type PlaytesterConfigShape = typeof PlaytesterConfig;
