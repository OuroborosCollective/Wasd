/**
 * LiveHeal v2 - Core Engine
 *
 * Orchestrates health monitoring, anomaly detection, root cause analysis,
 * strategy selection, healing execution, learning, and patch logging.
 *
 * Designed for WorldTick-only scheduling by default.
 * Excludes recursive healing in favor of explicit strategy pipelines.
 */

import { EventEmitter } from "node:events";
import type {
  LiveHealConfig,
  HealthSnapshot,
  HealthStatus,
  SubSystemAdapter,
  SubSystemRecord,
  SubSystemState,
  HealingStrategy,
  HealingResult,
  ErrorSignature,
  AnomalyObservation,
  RootCauseAnalysis,
  HealLogEntry,
  LoadBand,
} from "./LiveHealTypes.js";
import { LiveHealRegistry } from "./LiveHealRegistry.js";
import {
  transition,
  tryAcquireHealingLock,
  releaseHealingLock,
  isHealingTimedOut,
  isRelapse,
  type SubSystemStateMachine,
} from "./LiveHealStateMachine.js";
import { LiveHealStrategyRegistry } from "./LiveHealStrategyRegistry.js";
import { LiveHealPolicyEngine } from "./LiveHealPolicyEngine.js";
import {
  LiveHealLearningStore,
  hashSymptomTags,
} from "./LiveHealLearningStore.js";
import { LiveHealDependencyGraph } from "./LiveHealDependencyGraph.js";
import { LiveHealAnomalyDetector } from "./LiveHealAnomalyDetector.js";
import { LiveHealRootCauseAnalyzer } from "./LiveHealRootCauseAnalyzer.js";
import { LiveHealPatchLog } from "./LiveHealPatchLog.js";

const HEALING_TIMEOUT_MS = 60_000; // 60s max healing lock hold

export class LiveHealEngine extends EventEmitter {
  readonly config: LiveHealConfig;
  readonly registry: LiveHealRegistry;
  readonly strategyRegistry: LiveHealStrategyRegistry;
  readonly policyEngine: LiveHealPolicyEngine;
  readonly learningStore: LiveHealLearningStore;
  readonly dependencyGraph: LiveHealDependencyGraph;
  readonly anomalyDetector: LiveHealAnomalyDetector;
  readonly rootCauseAnalyzer: LiveHealRootCauseAnalyzer;
  readonly patchLog: LiveHealPatchLog;

  private tickCount = 0;
  private lastCheckTick = 0;
  /** How many ticks between health checks (default: every 10 ticks = ~1s at 100ms tick) */
  private readonly checkEveryNTicks: number;

  constructor(config: LiveHealConfig) {
    super();
    this.config = config;

    this.registry = new LiveHealRegistry();
    this.strategyRegistry = new LiveHealStrategyRegistry();
    this.policyEngine = new LiveHealPolicyEngine();
    this.learningStore = new LiveHealLearningStore(config.learningStorePath);
    this.dependencyGraph = new LiveHealDependencyGraph();
    this.patchLog = new LiveHealPatchLog(config.patchLogPath);

    this.anomalyDetector = new LiveHealAnomalyDetector(
      {
        windowSize: config.anomalyWindowSize,
        consecutiveRequired: 3,
        alertCooldownMs: 30_000,
      },
      config.thresholds
    );

    this.rootCauseAnalyzer = new LiveHealRootCauseAnalyzer(this.dependencyGraph);

    // Default: check every ~1 second (10 ticks at 100ms)
    this.checkEveryNTicks = Math.max(1, Math.round(config.checkIntervalMs / 100));
  }

  /**
   * Register a subsystem for monitoring.
   */
  registerSubsystem(adapter: SubSystemAdapter): void {
    this.registry.register(adapter);
    this.emit("subsystem:registered", { id: adapter.id });
  }

  /**
   * Register a healing strategy.
   */
  registerStrategy(strategy: HealingStrategy): void {
    this.strategyRegistry.register(strategy);
  }

  /**
   * Register dependency edges.
   */
  registerDependencies(edges: { from: string; to: string }[]): void {
    this.dependencyGraph.addEdges(edges);
  }

  /**
   * Register a policy rule.
   */
  addPolicyRule(rule: { id: string; description: string; [key: string]: unknown }): void {
    this.policyEngine.addRule(rule as any);
  }

  /**
   * Main tick handler - called from WorldTick.
   * Checks health, detects anomalies, and triggers healing as needed.
   */
  async onTick(): Promise<void> {
    this.tickCount += 1;

    // Only check health every N ticks
    if (this.tickCount - this.lastCheckTick < this.checkEveryNTicks) {
      return;
    }
    this.lastCheckTick = this.tickCount;

    // 1. Collect all health snapshots
    const snapshots = await this.registry.collectAllSnapshots();

    // 2. Process each subsystem
    for (const [id, snapshot] of snapshots) {
      await this.processSubsystemHealth(id, snapshot);
    }

    // 3. If multiple subsystems are degraded, do root cause analysis
    const records = this.registry.getAllRecords();
    const degradedIds = new Set<string>();
    for (const [id, record] of records) {
      if (record.state === "degraded" || record.state === "critical") {
        degradedIds.add(id);
      }
    }

    if (degradedIds.size > 1) {
      const analysis = this.rootCauseAnalyzer.analyze(records, snapshots, []);
      if (analysis.topSuspect) {
        // Heal the root cause first, skip victims
        const suspect = analysis.topSuspect;
        const suspectSM = this.registry.getStateMachine(suspect);
        if (suspectSM && !suspectSM.healingLocked) {
          await this.attemptHeal(suspect, snapshots.get(suspect)!, analysis);
        }
      }
    } else if (degradedIds.size === 1) {
      const id = Array.from(degradedIds)[0];
      const sm = this.registry.getStateMachine(id);
      if (sm && !sm.healingLocked) {
        const analysis: RootCauseAnalysis = {
          candidates: [{ subsystemId: id, score: 1, reasons: ["Only degraded subsystem"] }],
          topSuspect: id,
          victims: [],
          timestamp: Date.now(),
        };
        await this.attemptHeal(id, snapshots.get(id)!, analysis);
      }
    }

    // 4. Check for timed-out healing locks
    this.checkHealingTimeouts();

    // 5. Check cooldowns
    this.checkCooldowns();

    // 6. Periodic maintenance
    if (this.tickCount % 6000 === 0) { // ~10 minutes
      this.learningStore.flush();
      this.patchLog.compact();
      this.learningStore.prune(30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  /**
   * Process health snapshot for a single subsystem.
   */
  private async processSubsystemHealth(
    id: string,
    snapshot: HealthSnapshot
  ): Promise<void> {
    const sm = this.registry.getStateMachine(id);
    if (!sm) return;

    // Update record with snapshot
    this.registry.updateRecord(id, { lastSnapshot: snapshot });
    this.emit("subsystem:health_check", { id, snapshot });

    // Feed anomaly detector
    const anomalies = this.anomalyDetector.observe(id, snapshot);
    for (const anomaly of anomalies) {
      this.emit("anomaly:detected", anomaly);
    }

    // Determine health status trigger
    let trigger: "health_ok" | "health_degraded" | "health_critical" | null = null;
    if (snapshot.status === "healthy") {
      trigger = "health_ok";
    } else if (snapshot.status === "degraded") {
      trigger = "health_degraded";
    } else if (snapshot.status === "critical") {
      trigger = "health_critical";
    }

    if (!trigger) return;

    // Only transition if valid
    if (transition(sm, trigger, `Health check: ${snapshot.status} (score=${snapshot.score})`)) {
      this.registry.syncRecordState(id);
      this.emit("subsystem:state_change", sm.transitionLog[sm.transitionLog.length - 1]);

      // Update consecutive failures
      if (snapshot.status !== "healthy") {
        const record = this.registry.getRecord(id);
        if (record) {
          record.consecutiveFailures += 1;
          record.totalFailures += 1;
          record.lastError = snapshot.errorCode ?? snapshot.symptomTags.join(",") ?? "unknown";
          this.registry.updateRecord(id, record);
        }
      } else {
        // Reset on healthy
        this.registry.updateRecord(id, {
          consecutiveFailures: 0,
          healingAttempts: 0,
        });
        this.strategyRegistry.resetAttempts(id);
        this.anomalyDetector.reset(id);
      }
    }
  }

  /**
   * Attempt to heal a subsystem using the strategy pipeline.
   */
  private async attemptHeal(
    id: string,
    snapshot: HealthSnapshot,
    rootCauseAnalysis: RootCauseAnalysis
  ): Promise<void> {
    const sm = this.registry.getStateMachine(id);
    if (!sm) return;

    // Try to acquire healing lock
    if (!tryAcquireHealingLock(sm)) {
      this.emit("heal:blocked", {
        subsystem: id,
        strategy: "any",
        reason: sm.healingLocked ? "Already healing" : "State does not allow healing",
      });
      return;
    }

    // Transition to healing state
    transition(sm, "heal_started", "LiveHeal engine starting healing");
    this.registry.syncRecordState(id);
    this.registry.updateRecord(id, {
      healingAttempts: (this.registry.getRecord(id)?.healingAttempts ?? 0) + 1,
      lastHealingStartedAt: Date.now(),
    });

    // Build error signature
    const record = this.registry.getRecord(id);
    const loadBand: LoadBand = LiveHealPolicyEngine.getLoadBand(snapshot);
    const signature: ErrorSignature = {
      subsystem: id,
      errorCode: snapshot.errorCode ?? "health_degraded",
      symptomTags: snapshot.symptomTags,
      loadBand,
      dependencyContext: this.rootCauseAnalyzer.getDependencyContext(id),
    };

    // Check learning store for best strategy
    const learningSig = {
      subsystem: signature.subsystem,
      errorCode: signature.errorCode,
      symptomTagHash: hashSymptomTags(signature.symptomTags),
      loadBand: signature.loadBand,
    };
    const learnedStrategy = this.learningStore.getBestStrategy(learningSig);

    // Get candidate strategies
    let candidates = this.strategyRegistry.getCandidates(id);

    // If we have a learned best strategy, prioritize it
    if (learnedStrategy) {
      const learned = candidates.find((s) => s.name === learnedStrategy);
      if (learned) {
        candidates = [learned, ...candidates.filter((s) => s.name !== learnedStrategy)];
      }
    }

    let result: HealingResult | null = null;
    let chosenStrategy: HealingStrategy | null = null;

    for (const strategy of candidates) {
      // Check if strategy can run (attempts, cooldown)
      const canRun = this.strategyRegistry.canRun(strategy, id);
      if (!canRun.ok) {
        if (this.config.verbose) {
          console.log(`[LiveHeal] Strategy ${strategy.name} skipped for ${id}: ${canRun.reason}`);
        }
        continue;
      }

      // Check policy
      const policyResult = this.policyEngine.evaluate(strategy, record!, snapshot);
      if (!policyResult.allowed) {
        this.emit("heal:blocked", {
          subsystem: id,
          strategy: strategy.name,
          reason: policyResult.reason,
        });
        continue;
      }

      // Execute strategy
      this.emit("heal:started", { subsystem: id, strategy: strategy.name });
      const startTime = Date.now();
      chosenStrategy = strategy;

      try {
        result = await this.strategyRegistry.execute(strategy, id, snapshot, signature);
      } catch (error) {
        result = {
          success: false,
          strategyName: strategy.name,
          message: `Strategy threw: ${(error as Error).message}`,
          durationMs: Date.now() - startTime,
          sideEffects: ["strategy_exception"],
          serviceable: false,
        };
      }

      // Record learning
      this.learningStore.recordOutcome(
        learningSig,
        strategy.name,
        result.success,
        result.durationMs,
        result.sideEffects,
        strategy.preservesFeatures
      );

      // Log the result
      const relapse = isRelapse(sm, this.config.repeatedFailureWindowMs);
      this.patchLog.record({
        subsystem: id,
        previousState: sm.previousState,
        newState: result.success ? "healthy" : sm.state,
        errorSummary: snapshot.errorCode ?? snapshot.symptomTags.join(",") ?? "degraded",
        errorSignature: signature,
        strategyName: strategy.name,
        success: result.success,
        durationMs: result.durationMs,
        isRelapse: relapse,
        featurePreserved: strategy.preservesFeatures,
        riskLevel: strategy.riskLevel,
        rootCauseSuspect: rootCauseAnalysis.topSuspect,
        metrics: snapshot.metrics,
        quarantineRef: null,
      });

      if (result.success) {
        // Healing succeeded
        transition(sm, "heal_succeeded", `Healed via ${strategy.name}: ${result.message}`);
        this.registry.syncRecordState(id);
        this.registry.updateRecord(id, {
          lastHealingCompletedAt: Date.now(),
          totalHeals: (this.registry.getRecord(id)?.totalHeals ?? 0) + 1,
          consecutiveFailures: 0,
        });
        this.strategyRegistry.resetAttempts(id);
        this.anomalyDetector.reset(id);
        this.emit("heal:completed", { subsystem: id, result });
        return;
      }

      // If strategy didn't help, continue to next candidate
      if (this.config.verbose) {
        console.log(`[LiveHeal] Strategy ${strategy.name} failed for ${id}: ${result.message}`);
      }
    }

    // All strategies exhausted
    releaseHealingLock(sm);
    transition(sm, "heal_failed", `All strategies exhausted for ${id}`);
    this.registry.syncRecordState(id);
    this.registry.updateRecord(id, {
      lastHealingCompletedAt: Date.now(),
    });

    if (result) {
      this.emit("heal:completed", { subsystem: id, result });
    }

    // Check circuit breaker
    this.checkCircuitBreaker(id);
  }

  /**
   * Check for healing lock timeouts.
   */
  private checkHealingTimeouts(): void {
    for (const id of this.registry.getIds()) {
      const sm = this.registry.getStateMachine(id);
      if (sm && isHealingTimedOut(sm, HEALING_TIMEOUT_MS)) {
        console.warn(`[LiveHeal] Healing timeout for subsystem ${id}, releasing lock.`);
        releaseHealingLock(sm);
        transition(sm, "heal_failed", "Healing timeout");
        this.registry.syncRecordState(id);
      }
    }
  }

  /**
   * Check cooldown expiry.
   */
  private checkCooldowns(): void {
    const now = Date.now();
    for (const id of this.registry.getIds()) {
      const sm = this.registry.getStateMachine(id);
      const record = this.registry.getRecord(id);
      if (!sm || !record) continue;

      if (sm.state === "cooldown" && record.cooldownUntil > 0 && now >= record.cooldownUntil) {
        transition(sm, "cooldown_expired", "Cooldown period expired");
        this.registry.syncRecordState(id);
        this.registry.updateRecord(id, { cooldownUntil: 0 });
      }
    }
  }

  /**
   * Check circuit breaker for a subsystem.
   */
  private checkCircuitBreaker(id: string): void {
    const record = this.registry.getRecord(id);
    const sm = this.registry.getStateMachine(id);
    if (!record || !sm) return;

    const cbConfig = this.config.circuitBreaker;
    if (record.consecutiveFailures >= cbConfig.failureThreshold) {
      // Trip the circuit breaker
      transition(sm, "circuit_breaker_trip", `Circuit breaker tripped after ${record.consecutiveFailures} failures`);
      this.registry.syncRecordState(id);
      this.registry.updateRecord(id, {
        cooldownUntil: Date.now() + cbConfig.cooldownMs,
      });
      this.emit("circuit_breaker:trip", { subsystem: id, tripCount: record.totalFailures });
    }
  }

  /**
   * Manually trigger a health check for a specific subsystem.
   */
  async checkSubsystem(id: string): Promise<HealthSnapshot | null> {
    const adapter = this.registry.getAdapter(id);
    if (!adapter) return null;
    const snapshot = await adapter.getHealthSnapshot();
    await this.processSubsystemHealth(id, snapshot);
    return snapshot;
  }

  /**
   * Get current status of all subsystems.
   */
  getStatus(): {
    tickCount: number;
    subsystems: Array<{
      id: string;
      state: SubSystemState;
      score: number;
      healingLocked: boolean;
      consecutiveFailures: number;
    }>;
    learningEntries: number;
    logEntries: number;
  } {
    const subsystems = this.registry.getIds().map((id) => {
      const sm = this.registry.getStateMachine(id);
      const record = this.registry.getRecord(id);
      return {
        id,
        state: sm?.state ?? "healthy",
        score: record?.lastSnapshot?.score ?? 100,
        healingLocked: sm?.healingLocked ?? false,
        consecutiveFailures: record?.consecutiveFailures ?? 0,
      };
    });

    return {
      tickCount: this.tickCount,
      subsystems,
      learningEntries: this.learningStore.size,
      logEntries: this.patchLog.count,
    };
  }

  /**
   * Force persist all data (e.g. on shutdown).
   */
  flush(): void {
    this.learningStore.flush();
  }
}
