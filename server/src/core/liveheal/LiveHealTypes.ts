/**
 * LiveHeal v2 - Core type definitions for WASD runtime resilience layer.
 *
 * Snapshot-based health, state machines, strategy pipeline, learning store,
 * anomaly detection, root-cause analysis, and GLB asset integrity.
 *
 * Design: no external APIs, no Cloud dependency, no blind file deletion.
 */

// ─── Health Snapshot ────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "critical";

export interface HealthMetrics {
  latencyMs?: number;
  tickDurationMs?: number;
  queueDepth?: number;
  memoryUsageMb?: number;
  reconnectRate?: number;
  errorRate?: number;
  uptimeMs?: number;
  activeConnections?: number;
  custom?: Record<string, number>;
}

export interface HealthSnapshot {
  ok: boolean;
  status: HealthStatus;
  /** 0..100 composite health score */
  score: number;
  errorCode?: string;
  symptomTags: string[];
  metrics: HealthMetrics;
  probableCause?: string;
  details?: Record<string, unknown>;
  canServeReadOnly?: boolean;
}

// ─── Subsystem States ──────────────────────────────────────────────────────

export type SubSystemState =
  | "healthy"
  | "degraded"
  | "critical"
  | "healing"
  | "cooldown"
  | "fallback"
  | "quarantined"
  | "readOnly";

// ─── Subsystem Adapter ─────────────────────────────────────────────────────

export interface SubSystemAdapter {
  id: string;
  getHealthSnapshot(): Promise<HealthSnapshot> | HealthSnapshot;
  restart?(): Promise<void>;
  fallback?(): Promise<void>;
  enterReadOnlyMode?(): Promise<void>;
  exitReadOnlyMode?(): Promise<void>;
  /** Returns ids of subsystems this one depends on */
  getDependencies?(): string[];
  /** Returns feature ids that this subsystem provides */
  getProtectedFeatures?(): string[];
}

// ─── Subsystem State Record ────────────────────────────────────────────────

export interface SubSystemRecord {
  id: string;
  state: SubSystemState;
  previousState: SubSystemState;
  lastSnapshot: HealthSnapshot | null;
  lastStateChangeAt: number;
  healingAttempts: number;
  lastHealingStartedAt: number;
  lastHealingCompletedAt: number;
  cooldownUntil: number;
  consecutiveFailures: number;
  totalFailures: number;
  totalHeals: number;
  lastError: string | null;
}

// ─── Error Signature ───────────────────────────────────────────────────────

export type LoadBand = "low" | "medium" | "high";

export interface ErrorSignature {
  subsystem: string;
  errorCode: string;
  symptomTags: string[];
  loadBand: LoadBand;
  recentPatchId?: string;
  dependencyContext?: string[];
}

// ─── Healing Strategy ──────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export interface HealingStrategy {
  name: string;
  /** Subsystem ids this strategy applies to */
  subsystems: string[];
  riskLevel: RiskLevel;
  /** Minimum ms between consecutive runs for the same subsystem */
  cooldownMs: number;
  /** Max attempts before this strategy is skipped for a given subsystem */
  maxAttempts: number;
  /** Does this strategy touch persistent state? */
  mayTouchState: boolean;
  /** Does this strategy drop queued work? */
  mayDropQueue: boolean;
  /** Does this strategy preserve all gameplay features? */
  preservesFeatures: boolean;
  /** Ordered pipeline steps this strategy executes */
  run(subsystemId: string, snapshot: HealthSnapshot, signature: ErrorSignature): Promise<HealingResult>;
}

export interface HealingResult {
  success: boolean;
  strategyName: string;
  message: string;
  durationMs: number;
  /** Side effects observed */
  sideEffects: string[];
  /** Whether the subsystem is now serviceable (possibly degraded) */
  serviceable: boolean;
}

// ─── Healing Patch Log ─────────────────────────────────────────────────────

export interface HealLogEntry {
  patchId: string;
  timestamp: number;
  subsystem: string;
  previousState: SubSystemState;
  newState: SubSystemState;
  errorSummary: string;
  errorSignature: ErrorSignature | null;
  strategyName: string;
  success: boolean;
  durationMs: number;
  isRelapse: boolean;
  featurePreserved: boolean;
  riskLevel: RiskLevel;
  rootCauseSuspect: string | null;
  metrics: HealthMetrics | null;
  quarantineRef: string | null;
}

// ─── Learning Store ────────────────────────────────────────────────────────

export interface ErrorSignatureKey {
  subsystem: string;
  errorCode: string;
  symptomTagHash: string;
  loadBand: LoadBand;
}

export interface LearningEntry {
  signatureKey: string;
  occurrenceCount: number;
  lastStrategy: string;
  lastSuccess: boolean;
  successCount: number;
  failureCount: number;
  avgRecoveryMs: number;
  relapseCount: number;
  lastSideEffects: string[];
  featureSafe: boolean;
  lastLoadBand: LoadBand;
  lastSeenAt: number;
  firstSeenAt: number;
}

export interface StrategyScore {
  strategyName: string;
  score: number;
  successRate: number;
  avgRecoveryMs: number;
  relapseRate: number;
  sideEffectRate: number;
  featureSafe: boolean;
}

// ─── Anomaly Detection ─────────────────────────────────────────────────────

export interface AnomalyObservation {
  subsystem: string;
  metric: string;
  value: number;
  threshold: number;
  windowSize: number;
  consecutiveViolations: number;
  detectedAt: number;
}

export interface AnomalyConfig {
  windowSize: number;
  /** Number of consecutive threshold violations before alerting */
  consecutiveRequired: number;
  /** Cooldown between anomaly alerts for the same subsystem+metric */
  alertCooldownMs: number;
}

export interface MetricThresholds {
  tickDurationMs: { warning: number; critical: number };
  queueDepth: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  memoryUsageMb: { warning: number; critical: number };
  reconnectRate: { warning: number; critical: number };
  latencyMs: { warning: number; critical: number };
}

// ─── Circuit Breaker ───────────────────────────────────────────────────────

export interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  cooldownMs: number;
  quarantineAfterTrips: number;
}

export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  firstFailureAt: number;
  lastFailureAt: number;
  tripCount: number;
  cooldownUntil: number;
}

// ─── Feature Protection ────────────────────────────────────────────────────

export interface ProtectedFeature {
  id: string;
  name: string;
  subsystems: string[];
  description: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  /** If set, apply only during these load bands */
  loadBands?: LoadBand[];
  /** If set, block these strategy names */
  blockedStrategies?: string[];
  /** If set, only allow these strategy names */
  allowedStrategies?: string[];
  /** If set, apply only when these subsystems are degraded */
  activeWhenSubsystem?: string[];
  priority: number;
  enabled: boolean;
}

// ─── Dependency Graph ──────────────────────────────────────────────────────

export interface DependencyEdge {
  from: string;
  to: string;
}

// ─── GLB Asset Validation ──────────────────────────────────────────────────

export type GLBValidationSeverity = "ok" | "warning" | "hardFailure";

export interface GLBValidationIssue {
  severity: GLBValidationSeverity;
  code: string;
  message: string;
  byteOffset?: number;
}

export interface GLBValidationResult {
  filePath: string;
  valid: boolean;
  severity: GLBValidationSeverity;
  issues: GLBValidationIssue[];
  fileSize: number;
  mtimeMs: number;
  hash?: string;
  validatedAt: number;
}

export interface AssetCacheEntry {
  filePath: string;
  mtimeMs: number;
  fileSize: number;
  hash?: string;
  lastValidation: GLBValidationResult;
}

export interface QuarantineEntry {
  filePath: string;
  originalPath: string;
  quarantinePath: string;
  reason: string;
  issues: GLBValidationIssue[];
  quarantinedAt: number;
  fileSize: number;
  hash?: string;
}

export interface AssetHealthConfig {
  enabled: boolean;
  startupScan: boolean;
  incrementalScan: boolean;
  assetRootPaths: string[];
  quarantinePath: string;
  validateOnlyChangedFiles: boolean;
  hashStrategy: "mtime-size" | "sha1";
  /** Max file size in bytes to attempt GLB parse (default 500MB) */
  maxFileSizeBytes: number;
}

// ─── LiveHeal Configuration ────────────────────────────────────────────────

export interface LiveHealConfig {
  mode: "worldTick" | "timer";
  /** Only used when mode = "timer" */
  checkIntervalMs: number;
  maxRestartAttempts: number;
  restartCooldownMs: number;
  anomalyWindowSize: number;
  repeatedFailureWindowMs: number;
  quarantineThreshold: number;
  verbose: boolean;
  assetValidation: AssetHealthConfig;
  circuitBreaker: CircuitBreakerConfig;
  /** Global metric thresholds */
  thresholds: MetricThresholds;
  /** Path to persist learning data */
  learningStorePath: string;
  /** Path to persist patch logs */
  patchLogPath: string;
}

// ─── State Machine Events ──────────────────────────────────────────────────

export type StateTransitionTrigger =
  | "health_ok"
  | "health_degraded"
  | "health_critical"
  | "heal_started"
  | "heal_succeeded"
  | "heal_failed"
  | "cooldown_expired"
  | "circuit_breaker_trip"
  | "circuit_breaker_reset"
  | "manual_quarantine"
  | "manual_restore"
  | "anomaly_detected"
  | "dependency_failure"
  | "relapse_detected";

export interface StateTransition {
  from: SubSystemState;
  to: SubSystemState;
  trigger: StateTransitionTrigger;
  reason: string;
  timestamp: number;
  subsystem: string;
}

// ─── Engine Events ─────────────────────────────────────────────────────────

export interface LiveHealEvents {
  "subsystem:registered": { id: string };
  "subsystem:health_check": { id: string; snapshot: HealthSnapshot };
  "subsystem:state_change": StateTransition;
  "heal:started": { subsystem: string; strategy: string };
  "heal:completed": { subsystem: string; result: HealingResult };
  "heal:blocked": { subsystem: string; strategy: string; reason: string };
  "anomaly:detected": AnomalyObservation;
  "circuit_breaker:trip": { subsystem: string; tripCount: number };
  "asset:quarantined": QuarantineEntry;
  "asset:validated": GLBValidationResult;
  "learning:scored": { signatureKey: string; bestStrategy: string; score: number };
}
