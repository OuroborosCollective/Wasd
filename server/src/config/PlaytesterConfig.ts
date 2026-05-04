// @ts-nocheck
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

function envChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim().toLowerCase() as T;
  return allowed.includes(trimmed) ? trimmed : fallback;
}

function envIceServers(): string[] {
  const raw = process.env.PLAYTESTER_WEBRTC_ICE_SERVERS;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return ["stun:stun.l.google.com:19302"];
  }
  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : ["stun:stun.l.google.com:19302"];
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
  monitorSignalPath: envString("PLAYTESTER_MONITOR_SIGNAL_PATH", "/playtester-monitor-signal"),
  monitorPublisherPath: envString("PLAYTESTER_MONITOR_PUBLISHER_PATH", "/playtester-render-publisher"),
  monitorMode: envChoice("PLAYTESTER_MONITOR_MODE", "webrtc", ["webrtc", "local3d"] as const),
  monitorToken: (() => {
    const raw = process.env.PLAYTESTER_MONITOR_TOKEN;
    if (typeof raw !== "string") return "";
    return raw.trim();
  })(),
  monitorDefaultRadiusChunks: envInt("PLAYTESTER_MONITOR_RADIUS_CHUNKS", 2, 1, 8),
  monitorPerformanceRadiusChunks: envInt("PLAYTESTER_MONITOR_PERF_RADIUS_CHUNKS", 1, 1, 4),
  streamWidth: envInt("PLAYTESTER_STREAM_WIDTH", 640, 320, 3840),
  streamHeight: envInt("PLAYTESTER_STREAM_HEIGHT", 360, 180, 2160),
  streamFps: envInt("PLAYTESTER_STREAM_FPS", 15, 5, 60),
  streamQuality: envChoice("PLAYTESTER_STREAM_QUALITY", "low", ["low", "medium", "high"] as const),
  streamShadows: envFlag("PLAYTESTER_STREAM_SHADOWS", false),
  streamParticles: envFlag("PLAYTESTER_STREAM_PARTICLES", false),
  streamRenderDistance: envChoice(
    "PLAYTESTER_STREAM_RENDER_DISTANCE",
    "small",
    ["small", "medium", "large"] as const,
  ),
  streamIceServers: envIceServers(),
} as const;

export type PlaytesterConfigShape = typeof PlaytesterConfig;
