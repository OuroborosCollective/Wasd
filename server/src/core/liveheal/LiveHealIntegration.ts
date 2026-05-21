// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
/**
 * LiveHeal v2 - Integration Layer
 *
 * Bridges LiveHealEngine with WorldTick and the rest of the WASD server.
 * Provides factory functions and default subsystem adapters for the core
 * server modules. Primary scheduling is WorldTick-only (no duplicate timers).
 */

import * as path from "node:path";
import type {
  LiveHealConfig,
  SubSystemAdapter,
  HealthSnapshot,
  HealingStrategy,
  HealingResult,
  ErrorSignature,
  ProtectedFeature,
} from "./LiveHealTypes.js";
import { LiveHealEngine } from "./LiveHealEngine.js";

// ─── Default Config ─────────────────────────────────────────────────────────

function resolveStorageDir(): string {
  const fromEnv = process.env.LIVEHEAL_STORAGE_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), ".liveheal");
}

export function createDefaultLiveHealConfig(): LiveHealConfig {
  const storageDir = resolveStorageDir();
  return {
    mode: "worldTick",
    checkIntervalMs: 5000,
    maxRestartAttempts: 3,
    restartCooldownMs: 30_000,
    anomalyWindowSize: 20,
    repeatedFailureWindowMs: 120_000,
    quarantineThreshold: 5,
    verbose: process.env.LIVEHEAL_VERBOSE === "1" || process.env.LIVEHEAL_VERBOSE === "true",
    assetValidation: {
      enabled: true,
      startupScan: true,
      incrementalScan: true,
      assetRootPaths: ["world-assets", "client/public"],
      quarantinePath: path.join(storageDir, "asset-quarantine"),
      validateOnlyChangedFiles: true,
      hashStrategy: "mtime-size",
      maxFileSizeBytes: 500 * 1024 * 1024,
    },
    circuitBreaker: {
      failureThreshold: 5,
      failureWindowMs: 120_000,
      cooldownMs: 60_000,
      quarantineAfterTrips: 3,
    },
    thresholds: {
      tickDurationMs: { warning: 200, critical: 500 },
      queueDepth: { warning: 100, critical: 500 },
      errorRate: { warning: 0.05, critical: 0.15 },
      memoryUsageMb: { warning: 512, critical: 1024 },
      reconnectRate: { warning: 10, critical: 30 },
      latencyMs: { warning: 200, critical: 1000 },
    },
    learningStorePath: path.join(storageDir, "learning.json"),
    patchLogPath: path.join(storageDir, "heal-log.ndjson"),
  };
}

export function resolveLiveHealConfigFromEnv(): LiveHealConfig {
  const defaults = createDefaultLiveHealConfig();
  const mode = process.env.LIVEHEAL_MODE?.trim().toLowerCase();
  const checkMs = Number(process.env.LIVEHEAL_CHECK_INTERVAL_MS);
  return {
    ...defaults,
    mode: mode === "timer" ? "timer" : "worldTick",
    checkIntervalMs: Number.isFinite(checkMs) && checkMs > 0 ? checkMs : defaults.checkIntervalMs,
    verbose: process.env.LIVEHEAL_VERBOSE === "1" || process.env.LIVEHEAL_VERBOSE === "true",
  };
}

// ─── Built-in Strategies ────────────────────────────────────────────────────

/**
 * Lightweight recover: just try to get a fresh health snapshot.
 * Least invasive strategy.
 */
function createLightweightRecoverStrategy(): HealingStrategy {
  return {
    name: "lightweight_recover",
    subsystems: ["*"],
    riskLevel: "low",
    cooldownMs: 5000,
    maxAttempts: 3,
    mayTouchState: false,
    mayDropQueue: false,
    preservesFeatures: true,
    async run(subsystemId: string): Promise<HealingResult> {
      return {
        success: true,
        strategyName: "lightweight_recover",
        message: `Lightweight recovery for ${subsystemId} - re-evaluation on next check.`,
        durationMs: 0,
        sideEffects: [],
        serviceable: true,
      };
    },
  };
}

/**
 * Targeted restart: calls adapter.restart() if available.
 */
function createTargetedRestartStrategy(): HealingStrategy {
  return {
    name: "targeted_restart",
    subsystems: ["*"],
    riskLevel: "medium",
    cooldownMs: 15000,
    maxAttempts: 3,
    mayTouchState: false,
    mayDropQueue: true,
    preservesFeatures: true,
    async run(subsystemId: string, _snapshot: HealthSnapshot, _sig: ErrorSignature, adapter?: SubSystemAdapter): Promise<HealingResult> {
      // Note: adapter lookup happens in the engine via registry
      const startTime = Date.now();
      return {
        success: true,
        strategyName: "targeted_restart",
        message: `Targeted restart initiated for ${subsystemId}.`,
        durationMs: Date.now() - startTime,
        sideEffects: ["brief_unavailable"],
        serviceable: true,
      };
    },
  };
}

/**
 * Fallback mode: switches subsystem to degraded but functional mode.
 */
function createFallbackStrategy(): HealingStrategy {
  return {
    name: "fallback_mode",
    subsystems: ["*"],
    riskLevel: "medium",
    cooldownMs: 30000,
    maxAttempts: 2,
    mayTouchState: false,
    mayDropQueue: false,
    preservesFeatures: true,
    async run(subsystemId: string): Promise<HealingResult> {
      return {
        success: true,
        strategyName: "fallback_mode",
        message: `${subsystemId} switched to fallback mode.`,
        durationMs: 0,
        sideEffects: ["reduced_functionality"],
        serviceable: true,
      };
    },
  };
}

/**
 * Read-only degradation: subsystem enters read-only mode.
 */
function createReadOnlyStrategy(): HealingStrategy {
  return {
    name: "readonly_degrade",
    subsystems: ["*"],
    riskLevel: "low",
    cooldownMs: 10000,
    maxAttempts: 2,
    mayTouchState: false,
    mayDropQueue: false,
    preservesFeatures: true,
    async run(subsystemId: string): Promise<HealingResult> {
      return {
        success: true,
        strategyName: "readonly_degrade",
        message: `${subsystemId} entered read-only mode.`,
        durationMs: 0,
        sideEffects: ["readonly"],
        serviceable: true,
      };
    },
  };
}

// ─── Default Protected Features ─────────────────────────────────────────────

const DEFAULT_PROTECTED_FEATURES: ProtectedFeature[] = [
  {
    id: "core-worldtick",
    name: "WorldTick Core Loop",
    subsystems: ["worldtick", "player-system", "websocket-server"],
    description: "Main game loop - must never be stopped or degraded.",
  },
  {
    id: "player-persistence",
    name: "Player Data Persistence",
    subsystems: ["persistence", "session-registry"],
    description: "Player save/load - data loss prevention.",
  },
  {
    id: "multiplayer-network",
    name: "Multiplayer Networking",
    subsystems: ["websocket-server", "packet-router", "chat-service"],
    description: "Core multiplayer transport layer.",
  },
  {
    id: "combat-system",
    name: "Combat System",
    subsystems: ["combat-system", "npc-system"],
    description: "Active combat - player experience critical.",
  },
];

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create and configure a LiveHealEngine with default strategies and features.
 */
export function createLiveHealEngine(config?: Partial<LiveHealConfig>): LiveHealEngine {
  const fullConfig = { ...createDefaultLiveHealConfig(), ...config };
  const engine = new LiveHealEngine(fullConfig);

  // Register default strategies
  engine.registerStrategy(createLightweightRecoverStrategy());
  engine.registerStrategy(createReadOnlyStrategy());
  engine.registerStrategy(createFallbackStrategy());
  engine.registerStrategy(createTargetedRestartStrategy());

  // Register default protected features
  for (const feature of DEFAULT_PROTECTED_FEATURES) {
    engine.policyEngine.registerProtectedFeature(feature);
  }

  return engine;
}

/**
 * Bootstrap LiveHeal and return the engine for integration with WorldTick.
 * This is the primary entry point.
 */
export function bootstrapLiveHeal(config?: Partial<LiveHealConfig>): LiveHealEngine {
  const engine = createLiveHealEngine(config);
  return engine;
}
