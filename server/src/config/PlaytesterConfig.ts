type BoolFallback = boolean;

export type PlaytesterMonitorMode = "webrtc" | "local3d";
export type PlaytesterStreamQuality = "low" | "medium" | "high";
export type PlaytesterRenderDistance = "small" | "medium" | "large";

export type PlaytesterPersona =
  | "explorer"
  | "fighter"
  | "crafter"
  | "trader"
  | "quester"
  | "chaos_monkey"
  | "full_sweep";

export interface PlaytesterConfigShape {
  readonly enabled: boolean;
  readonly id: string;
  readonly displayName: string;
  readonly syntheticSocketId: string;

  readonly tickMs: number;
  readonly logEnabled: boolean;
  readonly streamEnabled: boolean;
  readonly maxEventsInMemory: number;

  readonly debugLogPath: string;

  readonly monitorPath: string;
  readonly monitorSignalPath: string;
  readonly monitorPublisherPath: string;
  readonly monitorMode: PlaytesterMonitorMode;
  readonly monitorToken: string;
  readonly monitorRequiresToken: boolean;

  readonly monitorDefaultRadiusChunks: number;
  readonly monitorPerformanceRadiusChunks: number;

  readonly streamWidth: number;
  readonly streamHeight: number;
  readonly streamFps: number;
  readonly streamQuality: PlaytesterStreamQuality;
  readonly streamShadows: boolean;
  readonly streamParticles: boolean;
  readonly streamRenderDistance: PlaytesterRenderDistance;
  readonly streamIceServers: readonly string[];

  readonly deterministicSeed: string;

  readonly persistentNpcEnabled: boolean;
  readonly persona: PlaytesterPersona;
  readonly routineIntervalTicks: number;
  readonly fullSweepEveryTicks: number;
  readonly repoLogEnabled: boolean;
  readonly repoLogPath: string;
  readonly repoCommitEnabled: boolean;
  readonly repoCommitEveryEvents: number;
}

function envFlag(key: string, fallback: BoolFallback): boolean {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;

  const v = raw.trim().toLowerCase();

  if (["1", "true", "yes", "on", "enabled"].includes(v)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(v)) return false;

  return fallback;
}

function envInt(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;

  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed)) return fallback;

  const value = Math.floor(parsed);
  return Math.min(max, Math.max(min, value));
}

function envString(key: string, fallback: string, options?: { maxLength?: number }): string {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;

  const maxLength = options?.maxLength ?? 256;
  return trimmed.slice(0, maxLength);
}

function envChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  const raw = process.env[key];
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim().toLowerCase();
  return allowed.includes(trimmed as T) ? (trimmed as T) : fallback;
}

function safeRoutePath(key: string, fallback: string): string {
  const value = envString(key, fallback, { maxLength: 128 });

  if (!value.startsWith("/")) return fallback;
  if (value.includes("..")) return fallback;
  if (value.includes("//")) return fallback;
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(value)) return fallback;

  return value;
}

function safeRelativeFilePath(key: string, fallback: string): string {
  const value = envString(key, fallback, { maxLength: 256 });

  if (value.startsWith("/")) return fallback;
  if (value.includes("..")) return fallback;
  if (value.includes("\0")) return fallback;
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(value)) return fallback;

  return value;
}

function envIdentifier(key: string, fallback: string, maxLength = 64): string {
  const value = envString(key, fallback, { maxLength });

  // Only allow alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) return fallback;

  return value;
}

function isValidIceServerUrl(value: string): boolean {
  return (
    value.startsWith("stun:") ||
    value.startsWith("turn:") ||
    value.startsWith("turns:")
  );
}

function envIceServers(): readonly string[] {
  const fallback = ["stun:stun.l.google.com:19302"] as const;

  const raw = process.env.PLAYTESTER_WEBRTC_ICE_SERVERS;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter(isValidIceServerUrl)
    .slice(0, 8);

  return Object.freeze(parsed.length > 0 ? parsed : [...fallback]);
}

function sanitizeToken(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 512);
}

function deriveDeterministicSeed(): string {
  return envString(
    "PLAYTESTER_DETERMINISTIC_SEED",
    "areloria-playtester-seed-v1",
    { maxLength: 128 },
  );
}

function assertConfig(config: PlaytesterConfigShape): void {
  if (config.enabled && config.monitorRequiresToken && config.monitorToken.length > 0 && config.monitorToken.length < 16) {
    throw new Error(
      "PLAYTESTER_MONITOR_TOKEN must be at least 16 characters when the playtester monitor requires a token.",
    );
  }

  const routeSet = new Set([
    config.monitorPath,
    config.monitorSignalPath,
    config.monitorPublisherPath,
  ]);

  if (routeSet.size !== 3) {
    throw new Error(
      "Playtester monitor routes must be unique.",
    );
  }

  if (config.monitorPerformanceRadiusChunks > config.monitorDefaultRadiusChunks) {
    throw new Error(
      "PLAYTESTER_MONITOR_PERF_RADIUS_CHUNKS must be <= PLAYTESTER_MONITOR_RADIUS_CHUNKS.",
    );
  }

  if (config.streamWidth * config.streamHeight > 3840 * 2160) {
    throw new Error("Playtester stream resolution exceeds 4K limit.");
  }

  if (config.streamFps > 30 && config.streamQuality === "high") {
    throw new Error(
      "High quality Playtester streaming above 30 FPS is disabled to protect VPS performance.",
    );
  }

  if (config.fullSweepEveryTicks < config.routineIntervalTicks * 6) {
    throw new Error(
      "PLAYTESTER_FULL_SWEEP_EVERY_TICKS must be at least 6× PLAYTESTER_ROUTINE_INTERVAL_TICKS.",
    );
  }
}

function createPlaytesterConfig(): PlaytesterConfigShape {
  const config: PlaytesterConfigShape = {
    enabled: envFlag("PLAYTESTER_ENABLED", false),

    id: envIdentifier("PLAYTESTER_ID", "playtester_001"),
    displayName: envString("PLAYTESTER_DISPLAY_NAME", "Areloria Sentinel", {
      maxLength: 64,
    }),
    syntheticSocketId: envIdentifier(
      "PLAYTESTER_SOCKET_ID",
      "playtester_socket_001",
    ),

    tickMs: envInt("PLAYTESTER_TICK_MS", 500, 100, 5000),
    logEnabled: envFlag("PLAYTESTER_LOG_ENABLED", true),
    streamEnabled: envFlag("PLAYTESTER_STREAM_ENABLED", true),
    maxEventsInMemory: envInt("PLAYTESTER_MAX_EVENTS_IN_MEMORY", 50, 10, 500),

    debugLogPath: safeRelativeFilePath(
      "PLAYTESTER_DEBUG_LOG_PATH",
      "data/logs/playtester-debug.jsonl",
    ),

    monitorPath: safeRoutePath("PLAYTESTER_MONITOR_PATH", "/playtester-monitor"),
    monitorSignalPath: safeRoutePath(
      "PLAYTESTER_MONITOR_SIGNAL_PATH",
      "/playtester-monitor-signal",
    ),
    monitorPublisherPath: safeRoutePath(
      "PLAYTESTER_MONITOR_PUBLISHER_PATH",
      "/playtester-render-publisher",
    ),

    monitorMode: envChoice<PlaytesterMonitorMode>(
      "PLAYTESTER_MONITOR_MODE",
      "webrtc",
      ["webrtc", "local3d"] as const,
    ),

    monitorToken: sanitizeToken(process.env.PLAYTESTER_MONITOR_TOKEN),
    monitorRequiresToken: envFlag("PLAYTESTER_MONITOR_REQUIRES_TOKEN", true),

    monitorDefaultRadiusChunks: envInt(
      "PLAYTESTER_MONITOR_RADIUS_CHUNKS",
      2,
      1,
      8,
    ),
    monitorPerformanceRadiusChunks: envInt(
      "PLAYTESTER_MONITOR_PERF_RADIUS_CHUNKS",
      1,
      1,
      4,
    ),

    streamWidth: envInt("PLAYTESTER_STREAM_WIDTH", 640, 320, 3840),
    streamHeight: envInt("PLAYTESTER_STREAM_HEIGHT", 360, 180, 2160),
    streamFps: envInt("PLAYTESTER_STREAM_FPS", 15, 5, 60),

    streamQuality: envChoice<PlaytesterStreamQuality>(
      "PLAYTESTER_STREAM_QUALITY",
      "low",
      ["low", "medium", "high"] as const,
    ),

    streamShadows: envFlag("PLAYTESTER_STREAM_SHADOWS", false),
    streamParticles: envFlag("PLAYTESTER_STREAM_PARTICLES", false),

    streamRenderDistance: envChoice<PlaytesterRenderDistance>(
      "PLAYTESTER_STREAM_RENDER_DISTANCE",
      "small",
      ["small", "medium", "large"] as const,
    ),

    streamIceServers: envIceServers(),

    deterministicSeed: deriveDeterministicSeed(),

    persistentNpcEnabled: envFlag("PLAYTESTER_PERSISTENT_NPC_ENABLED", true),
    persona: envChoice<PlaytesterPersona>(
      "PLAYTESTER_PERSONA",
      "full_sweep",
      [
        "explorer",
        "fighter",
        "crafter",
        "trader",
        "quester",
        "chaos_monkey",
        "full_sweep",
      ] as const,
    ),
    routineIntervalTicks: envInt(
      "PLAYTESTER_ROUTINE_INTERVAL_TICKS",
      10,
      1,
      600,
    ),
    fullSweepEveryTicks: envInt(
      "PLAYTESTER_FULL_SWEEP_EVERY_TICKS",
      600,
      60,
      36000,
    ),
    repoLogEnabled: envFlag("PLAYTESTER_REPO_LOG_ENABLED", true),
    repoLogPath: safeRelativeFilePath(
      "PLAYTESTER_REPO_LOG_PATH",
      "logs/playtester/playtester-events.jsonl",
    ),
    repoCommitEnabled: envFlag("PLAYTESTER_REPO_COMMIT_ENABLED", false),
    repoCommitEveryEvents: envInt(
      "PLAYTESTER_REPO_COMMIT_EVERY_EVENTS",
      100,
      10,
      5000,
    ),
  };

  assertConfig(config);

  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return config;
  }

  return Object.freeze(config);
}

export const PlaytesterConfig = createPlaytesterConfig();

export function getSafePlaytesterConfigForLogs(): Omit<
  PlaytesterConfigShape,
  "monitorToken"
> & { readonly monitorToken: "[redacted]" | "" } {
  return {
    ...PlaytesterConfig,
    monitorToken: PlaytesterConfig.monitorToken.length > 0 ? "[redacted]" : "",
  };
}
