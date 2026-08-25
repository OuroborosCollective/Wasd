import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LiveHealEngine,
  LiveHealRegistry,
  LiveHealStateMachine,
  LiveHealStrategyRegistry,
  LiveHealPolicyEngine,
  LiveHealLearningStore,
  LiveHealDependencyGraph,
  LiveHealAnomalyDetector,
  LiveHealRootCauseAnalyzer,
  LiveHealPatchLog,
  hashSymptomTags,
  createLiveHealEngine,
  createDefaultLiveHealConfig,
} from "../core/liveheal/index.js";
import type {
  HealthSnapshot,
  SubSystemAdapter,
  HealingStrategy,
  HealingResult,
  ErrorSignature,
  SubSystemRecord,
} from "../core/liveheal/LiveHealTypes.js";
import {
  createStateMachine,
  transition,
  canTransition,
  tryAcquireHealingLock,
  releaseHealingLock,
  isHealingTimedOut,
  isRelapse,
} from "../core/liveheal/LiveHealStateMachine.js";

describe("LiveHeal v2", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "liveheal-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── State Machine ──────────────────────────────────────────────────────

  describe("StateMachine", () => {
    it("starts in healthy state", () => {
      const sm = createStateMachine("test");
      expect(sm.state).toBe("healthy");
      expect(sm.healingLocked).toBe(false);
    });

    it("transitions healthy -> degraded on health_degraded", () => {
      const sm = createStateMachine("test");
      const t = transition(sm, "health_degraded", "latency spike");
      expect(t).not.toBeNull();
      expect(sm.state).toBe("degraded");
      expect(sm.previousState).toBe("healthy");
      expect(t!.trigger).toBe("health_degraded");
    });

    it("transitions degraded -> healing -> healthy on heal_succeeded", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "test");
      transition(sm, "heal_started", "starting repair");
      expect(sm.state).toBe("healing");
      expect(sm.healingLocked).toBe(true);

      const result = transition(sm, "heal_succeeded", "fixed");
      expect(result).not.toBeNull();
      expect(sm.state).toBe("healthy");
      expect(sm.healingLocked).toBe(false);
    });

    it("blocks invalid transitions", () => {
      const sm = createStateMachine("test");
      const result = transition(sm, "heal_succeeded", "should fail");
      expect(result).toBeNull();
      expect(sm.state).toBe("healthy");
    });

    it("enforces healing lock", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "test");
      expect(tryAcquireHealingLock(sm)).toBe(true);
      transition(sm, "heal_started", "locking");
      expect(tryAcquireHealingLock(sm)).toBe(false);
      expect(sm.healingLocked).toBe(true);
    });

    it("detects healing timeout", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "test");
      transition(sm, "heal_started", "locking");
      sm.healingStartedAt = -120_000;
      expect(isHealingTimedOut(sm, 60_000)).toBe(true);
    });

    it("releases healing lock", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "test");
      transition(sm, "heal_started", "locking");
      releaseHealingLock(sm);
      expect(sm.healingLocked).toBe(false);
    });

    it("detects relapse pattern", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "degraded");
      transition(sm, "heal_started", "healing");
      transition(sm, "heal_succeeded", "fixed");
      transition(sm, "health_degraded", "degraded again");
      expect(isRelapse(sm, 60_000)).toBe(true);
    });

    it("handles quarantined state", () => {
      const sm = createStateMachine("test");
      transition(sm, "health_degraded", "degraded");
      transition(sm, "manual_quarantine", "corruption found");
      expect(sm.state).toBe("quarantined");
      transition(sm, "manual_restore", "fixed externally");
      expect(sm.state).toBe("healthy");
    });
  });

  // ─── Strategy Registry ──────────────────────────────────────────────────

  describe("StrategyRegistry", () => {
    it("registers and retrieves strategies", () => {
      const registry = new LiveHealStrategyRegistry();
      const strategy: HealingStrategy = {
        name: "test_strategy",
        subsystems: ["*"],
        riskLevel: "low",
        cooldownMs: 1000,
        maxAttempts: 3,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> {
          return { success: true, strategyName: "test", message: "ok", durationMs: 10, sideEffects: [], serviceable: true };
        },
      };
      registry.register(strategy);
      expect(registry.get("test_strategy")).toBeDefined();
      expect(registry.list()).toContain("test_strategy");
    });

    it("respects max attempts", () => {
      const registry = new LiveHealStrategyRegistry();
      const strategy: HealingStrategy = {
        name: "limited",
        subsystems: ["test"],
        riskLevel: "low",
        cooldownMs: 0,
        maxAttempts: 2,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> {
          return { success: false, strategyName: "limited", message: "fail", durationMs: 0, sideEffects: [], serviceable: false };
        },
      };
      registry.register(strategy);

      expect(registry.canRun(strategy, "test").ok).toBe(true);
      // Execute twice
      const sig: ErrorSignature = { subsystem: "test", errorCode: "test", symptomTags: [], loadBand: "low" };
      const snap: HealthSnapshot = { ok: false, status: "degraded", score: 50, symptomTags: [], metrics: {} };
      registry.execute(strategy, "test", snap, sig);
      registry.execute(strategy, "test", snap, sig);
      expect(registry.canRun(strategy, "test").ok).toBe(false);
    });

    it("respects cooldown", () => {
      const registry = new LiveHealStrategyRegistry();
      const strategy: HealingStrategy = {
        name: "cooldown_test",
        subsystems: ["test"],
        riskLevel: "low",
        cooldownMs: 10_000,
        maxAttempts: 5,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> {
          return { success: true, strategyName: "test", message: "ok", durationMs: 0, sideEffects: [], serviceable: true };
        },
      };
      registry.register(strategy);
      const sig: ErrorSignature = { subsystem: "test", errorCode: "test", symptomTags: [], loadBand: "low" };
      const snap: HealthSnapshot = { ok: false, status: "degraded", score: 50, symptomTags: [], metrics: {} };
      registry.execute(strategy, "test", snap, sig);
      const result = registry.canRun(strategy, "test");
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Cooldown");
    });

    it("resets attempts on success", async () => {
      const registry = new LiveHealStrategyRegistry();
      const strategy: HealingStrategy = {
        name: "reset_test",
        subsystems: ["test"],
        riskLevel: "low",
        cooldownMs: 0,
        maxAttempts: 5,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> {
          return { success: true, strategyName: "reset_test", message: "ok", durationMs: 0, sideEffects: [], serviceable: true };
        },
      };
      registry.register(strategy);
      const sig: ErrorSignature = { subsystem: "test", errorCode: "test", symptomTags: [], loadBand: "low" };
      const snap: HealthSnapshot = { ok: false, status: "degraded", score: 50, symptomTags: [], metrics: {} };

      // After first execute, attempt count resets to 0 because strategy succeeds
      await registry.execute(strategy, "test", snap, sig);
      expect(registry.getAttemptCount("reset_test", "test")).toBe(0);

      // After second execute, attempt count resets to 0 again
      await registry.execute(strategy, "test", snap, sig);
      expect(registry.getAttemptCount("reset_test", "test")).toBe(0);
    });
  });

  // ─── Policy Engine ──────────────────────────────────────────────────────

  describe("PolicyEngine", () => {
    it("blocks high-risk strategies for critical subsystems", () => {
      const engine = new LiveHealPolicyEngine();
      const strategy: HealingStrategy = {
        name: "dangerous",
        subsystems: ["test"],
        riskLevel: "high",
        cooldownMs: 0,
        maxAttempts: 3,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> { return { success: true, strategyName: "", message: "", durationMs: 0, sideEffects: [], serviceable: true }; },
      };
      const record: SubSystemRecord = {
        id: "test", state: "critical", previousState: "degraded", lastSnapshot: null,
        lastStateChangeAt: Date.now(), healingAttempts: 0, lastHealingStartedAt: 0,
        lastHealingCompletedAt: 0, cooldownUntil: 0, consecutiveFailures: 0,
        totalFailures: 0, totalHeals: 0, lastError: null,
      };
      const snapshot: HealthSnapshot = { ok: false, status: "critical", score: 10, symptomTags: [], metrics: {} };
      const result = engine.evaluate(strategy, record, snapshot);
      expect(result.allowed).toBe(false);
    });

    it("allows low-risk strategies for degraded subsystems", () => {
      const engine = new LiveHealPolicyEngine();
      const strategy: HealingStrategy = {
        name: "safe",
        subsystems: ["test"],
        riskLevel: "low",
        cooldownMs: 0,
        maxAttempts: 3,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(): Promise<HealingResult> { return { success: true, strategyName: "", message: "", durationMs: 0, sideEffects: [], serviceable: true }; },
      };
      const record: SubSystemRecord = {
        id: "test", state: "degraded", previousState: "healthy", lastSnapshot: null,
        lastStateChangeAt: Date.now(), healingAttempts: 0, lastHealingStartedAt: 0,
        lastHealingCompletedAt: 0, cooldownUntil: 0, consecutiveFailures: 1,
        totalFailures: 1, totalHeals: 0, lastError: null,
      };
      const snapshot: HealthSnapshot = { ok: false, status: "degraded", score: 50, symptomTags: [], metrics: { activeConnections: 10 } };
      const result = engine.evaluate(strategy, record, snapshot);
      expect(result.allowed).toBe(true);
    });
  });

  // ─── Learning Store ─────────────────────────────────────────────────────

  describe("LearningStore", () => {
    it("persists and retrieves learning entries", () => {
      const storePath = path.join(tmpDir, "learning.json");
      const store = new LiveHealLearningStore(storePath);

      store.recordOutcome(
        { subsystem: "test", errorCode: "timeout", symptomTagHash: "slow,degraded", loadBand: "medium" },
        "lightweight_recover",
        true,
        1500,
        [],
        true
      );

      store.flush();

      const store2 = new LiveHealLearningStore(storePath);
      const best = store2.getBestStrategy({ subsystem: "test", errorCode: "timeout", symptomTagHash: "slow,degraded", loadBand: "medium" });
      expect(best).toBe("lightweight_recover");
    });

    it("computes strategy scores", () => {
      const storePath = path.join(tmpDir, "learning2.json");
      const store = new LiveHealLearningStore(storePath);

      store.recordOutcome(
        { subsystem: "test", errorCode: "crash", symptomTagHash: "critical", loadBand: "high" },
        "targeted_restart",
        true,
        500,
        [],
        true
      );
      store.recordOutcome(
        { subsystem: "test", errorCode: "crash", symptomTagHash: "critical", loadBand: "high" },
        "targeted_restart",
        true,
        300,
        [],
        true
      );

      const scores = store.getStrategyScores({ subsystem: "test", errorCode: "crash", symptomTagHash: "critical", loadBand: "high" });
      expect(scores.length).toBe(1);
      expect(scores[0].successRate).toBe(1);
      expect(scores[0].featureSafe).toBe(true);
    });

    it("handles corrupt data gracefully", () => {
      const storePath = path.join(tmpDir, "corrupt.json");
      fs.writeFileSync(storePath, "{corrupt json", "utf-8");
      const store = new LiveHealLearningStore(storePath);
      expect(store.size).toBe(0);
    });
  });

  // ─── Dependency Graph ───────────────────────────────────────────────────

  describe("DependencyGraph", () => {
    it("builds and queries dependencies", () => {
      const graph = new LiveHealDependencyGraph();
      graph.addEdges([
        { from: "combat", to: "player" },
        { from: "combat", to: "npc" },
        { from: "player", to: "worldtick" },
        { from: "npc", to: "worldtick" },
      ]);

      expect(graph.getDependencies("combat")).toContain("player");
      expect(graph.getDependencies("combat")).toContain("npc");
      expect(graph.getDependents("worldtick")).toContain("player");
      expect(graph.getDependents("worldtick")).toContain("npc");
    });

    it("ranks root causes correctly", () => {
      const graph = new LiveHealDependencyGraph();
      graph.addEdges([
        { from: "combat", to: "player" },
        { from: "combat", to: "npc" },
        { from: "player", to: "worldtick" },
        { from: "npc", to: "worldtick" },
      ]);

      const degraded = new Set(["combat", "player", "npc"]);
      const ranked = graph.rankRootCauses(degraded);
      // player and npc are upstream of combat, so they should be ranked higher
      expect(ranked[0]).not.toBe("combat");
    });

    it("computes transitive dependencies", () => {
      const graph = new LiveHealDependencyGraph();
      graph.addEdges([
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ]);
      const deps = graph.getAllDependencies("a");
      expect(deps).toContain("b");
      expect(deps).toContain("c");
    });
  });

  // ─── Anomaly Detector ───────────────────────────────────────────────────

  describe("AnomalyDetector", () => {
    it("detects sustained threshold violations", () => {
      const detector = new LiveHealAnomalyDetector(
        { windowSize: 10, consecutiveRequired: 2, alertCooldownMs: 0 },
        {
          tickDurationMs: { warning: 200, critical: 500 },
          queueDepth: { warning: 100, critical: 500 },
          errorRate: { warning: 0.05, critical: 0.15 },
          memoryUsageMb: { warning: 512, critical: 1024 },
          reconnectRate: { warning: 10, critical: 30 },
          latencyMs: { warning: 200, critical: 1000 },
        }
      );

      // Feed many high values to warm up EMA and trigger detection
      let anomalies: any[] = [];
      for (let i = 0; i < 15; i++) {
        anomalies = detector.observe("test", {
          ok: false, status: "degraded", score: 40,
          symptomTags: [],
          metrics: { tickDurationMs: 600 },
        });
      }

      // EMA should have warmed up and consecutive violations should trigger
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].metric).toBe("tickDurationMs");
    });
  });

  // ─── Patch Log ──────────────────────────────────────────────────────────

  describe("PatchLog", () => {
    it("records and reads entries", () => {
      const logPath = path.join(tmpDir, "heal-log.ndjson");
      const log = new LiveHealPatchLog(logPath);

      const entry = log.record({
        subsystem: "test",
        previousState: "degraded",
        newState: "healthy",
        errorSummary: "timeout",
        errorSignature: null,
        strategyName: "lightweight_recover",
        success: true,
        durationMs: 500,
        isRelapse: false,
        featurePreserved: true,
        riskLevel: "low",
        rootCauseSuspect: null,
        metrics: null,
        quarantineRef: null,
      });

      expect(entry.patchId).toMatch(/^LH-/);

      const recent = log.readRecent(5);
      expect(recent.length).toBe(1);
      expect(recent[0].subsystem).toBe("test");
    });

    it("handles corrupt lines", () => {
      const logPath = path.join(tmpDir, "corrupt-log.ndjson");
      fs.writeFileSync(logPath, "not json\n{\"valid\": true}\nbroken{\n", "utf-8");
      const log = new LiveHealPatchLog(logPath);
      const entries = log.readAll();
      expect(entries.length).toBe(0); // Only valid HealLogEntry objects
    });
  });

  // ─── Engine Integration ─────────────────────────────────────────────────

  describe("Engine", () => {
    it("creates engine with default config", () => {
      const engine = createLiveHealEngine({
        learningStorePath: path.join(tmpDir, "learn.json"),
        patchLogPath: path.join(tmpDir, "log.ndjson"),
      });
      expect(engine.registry.size).toBe(0);
      expect(engine.strategyRegistry.list().length).toBeGreaterThan(0);
    });

    it("registers subsystems and runs health checks", async () => {
      const engine = createLiveHealEngine({
        learningStorePath: path.join(tmpDir, "learn.json"),
        patchLogPath: path.join(tmpDir, "log.ndjson"),
        checkIntervalMs: 0, // Check every tick
      });

      let healthStatus: "healthy" | "degraded" = "healthy";
      engine.registerSubsystem({
        id: "test-sub",
        getHealthSnapshot: (): HealthSnapshot => ({
          ok: healthStatus === "healthy",
          status: healthStatus,
          score: healthStatus === "healthy" ? 100 : 40,
          symptomTags: healthStatus === "healthy" ? [] : ["test_degraded"],
          metrics: {},
          canServeReadOnly: true,
        }),
      });

      // Healthy tick
      await engine.onTick();
      const s1 = engine.getStatus();
      expect(s1.subsystems[0].state).toBe("healthy");

      // Degrade - engine will detect and heal in the same tick (lightweight_recover)
      healthStatus = "degraded";
      await engine.onTick();
      // After healing, the engine transitions back to healthy
      const s2 = engine.getStatus();
      expect(s2.subsystems[0].state).toBe("healthy");

      // Verify the healing was attempted via patch log
      const logs = engine.patchLog.readRecent(5);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].success).toBe(true);
    });

    it("respects healing lock (no parallel heals)", async () => {
      const engine = createLiveHealEngine({
        learningStorePath: path.join(tmpDir, "learn.json"),
        patchLogPath: path.join(tmpDir, "log.ndjson"),
        checkIntervalMs: 0,
      });

      let healCalls = 0;
      engine.registerStrategy({
        name: "slow_heal",
        subsystems: ["*"],
        riskLevel: "low",
        cooldownMs: 0,
        maxAttempts: 5,
        mayTouchState: false,
        mayDropQueue: false,
        preservesFeatures: true,
        async run(subsystemId: string): Promise<HealingResult> {
          healCalls += 1;
          // Simulate slow healing by staying in healing state
          await new Promise((r) => setTimeout(r, 50));
          return { success: true, strategyName: "slow_heal", message: "fixed", durationMs: 50, sideEffects: [], serviceable: true };
        },
      });

      engine.registerSubsystem({
        id: "test-lock",
        getHealthSnapshot: (): HealthSnapshot => ({
          ok: false, status: "degraded", score: 30,
          symptomTags: ["test"],
          metrics: {},
          canServeReadOnly: true,
        }),
      });

      // First tick - starts healing
      await engine.onTick();
      // Second tick - should skip because lock is held
      await engine.onTick();
      // Wait for healing to complete
      await new Promise((r) => setTimeout(r, 100));
      // Third tick - should recover
      await engine.onTick();

      expect(healCalls).toBeLessThanOrEqual(2); // At most 2 calls due to lock
    });
  });
});
