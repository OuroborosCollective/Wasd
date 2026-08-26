/**
 * LiveHeal v2 - Per-subsystem state machine.
 *
 * All state transitions are explicit, logged, and must have a valid trigger.
 * Enforces that at most one healing operation runs per subsystem.
 */

import { ARE_SIMULATION_TICK_MS } from "../determinism/AREDeterminism.js";
import type {
  SubSystemState,
  StateTransitionTrigger,
  StateTransition,
  HealingStrategy,
} from "./LiveHealTypes.js";

const VALID_TRANSITIONS: Record<
  SubSystemState,
  Partial<Record<StateTransitionTrigger, SubSystemState>>
> = {
  healthy: {
    health_degraded: "degraded",
    health_critical: "critical",
    anomaly_detected: "degraded",
    dependency_failure: "degraded",
    manual_quarantine: "quarantined",
  },
  degraded: {
    health_ok: "healthy",
    health_critical: "critical",
    heal_started: "healing",
    manual_quarantine: "quarantined",
    circuit_breaker_trip: "cooldown",
    anomaly_detected: "critical",
  },
  critical: {
    health_ok: "healthy",
    health_degraded: "degraded",
    heal_started: "healing",
    manual_quarantine: "quarantined",
    circuit_breaker_trip: "quarantined",
  },
  healing: {
    heal_succeeded: "healthy",
    heal_failed: "cooldown",
    manual_quarantine: "quarantined",
  },
  cooldown: {
    cooldown_expired: "degraded",
    health_ok: "healthy",
    manual_quarantine: "quarantined",
    manual_restore: "healthy",
  },
  fallback: {
    health_ok: "healthy",
    heal_started: "healing",
    manual_quarantine: "quarantined",
    manual_restore: "healthy",
  },
  quarantined: {
    manual_restore: "healthy",
    health_ok: "healthy",
  },
  readOnly: {
    health_ok: "healthy",
    manual_restore: "healthy",
    manual_quarantine: "quarantined",
  },
};

export interface SubSystemStateMachine {
  readonly id: string;
  state: SubSystemState;
  previousState: SubSystemState;
  lastTransitionAt: number;
  transitionLog: StateTransition[];
  /** True when a healing operation is in progress */
  healingLocked: boolean;
  /** Timestamp when healing started (for timeout detection) */
  healingStartedAt: number;
}

function stateMachineNow(sm: SubSystemStateMachine, _label: string): number {
  // A transition count gives every state machine a reproducible, monotonic
  // simulation timeline. Hash-derived values are deterministic but do not
  // preserve elapsed-time ordering and therefore cannot drive time windows.
  return sm.transitionLog.length * ARE_SIMULATION_TICK_MS;
}

export function createStateMachine(id: string): SubSystemStateMachine {
  return {
    id,
    state: "healthy",
    previousState: "healthy",
    lastTransitionAt: 0,
    transitionLog: [],
    healingLocked: false,
    healingStartedAt: 0,
  };
}

export function canTransition(
  sm: SubSystemStateMachine,
  trigger: StateTransitionTrigger
): boolean {
  const allowed = VALID_TRANSITIONS[sm.state];
  return trigger in allowed;
}

export function transition(
  sm: SubSystemStateMachine,
  trigger: StateTransitionTrigger,
  reason: string
): StateTransition | null {
  const allowed = VALID_TRANSITIONS[sm.state];
  const targetState = allowed[trigger];
  if (targetState === undefined) {
    return null;
  }
  const now = stateMachineNow(sm, trigger);
  const entry: StateTransition = {
    from: sm.state,
    to: targetState,
    trigger,
    reason,
    timestamp: now,
    subsystem: sm.id,
  };
  sm.previousState = sm.state;
  sm.state = targetState;
  sm.lastTransitionAt = now;
  sm.transitionLog.push(entry);

  // Manage healing lock
  if (trigger === "heal_started") {
    sm.healingLocked = true;
    sm.healingStartedAt = now;
  } else if (trigger === "heal_succeeded" || trigger === "heal_failed") {
    sm.healingLocked = false;
    sm.healingStartedAt = 0;
  }

  return entry;
}

/**
 * Attempt to acquire the healing lock. Returns false if already locked
 * or if the current state does not allow healing.
 */
export function tryAcquireHealingLock(sm: SubSystemStateMachine): boolean {
  if (sm.healingLocked) {
    return false;
  }
  if (sm.state !== "degraded" && sm.state !== "critical") {
    return false;
  }
  return true;
}

/**
 * Release the healing lock without a state change (e.g. on timeout/cancel).
 */
export function releaseHealingLock(sm: SubSystemStateMachine): void {
  sm.healingLocked = false;
  sm.healingStartedAt = 0;
}

/**
 * Check if the healing lock has been held for too long.
 */
export function isHealingTimedOut(
  sm: SubSystemStateMachine,
  timeoutMs: number
): boolean {
  if (!sm.healingLocked || sm.healingStartedAt === 0) {
    return false;
  }
  return stateMachineNow(sm, "timeout-check") - sm.healingStartedAt > timeoutMs;
}

/**
 * Get the last N transitions from the log.
 */
export function getRecentTransitions(
  sm: SubSystemStateMachine,
  count: number
): StateTransition[] {
  return sm.transitionLog.slice(-count);
}

/**
 * Check if there has been a relapse (healthy -> degraded/critical within windowMs).
 */
export function isRelapse(sm: SubSystemStateMachine, windowMs: number): boolean {
  const now = stateMachineNow(sm, "relapse-check");
  const recentTransitions = sm.transitionLog.filter((t) => now - t.timestamp < windowMs);

  // Look for a pattern: ... -> healthy -> ... -> degraded/critical
  let foundHealthyRecovery = false;
  for (const t of recentTransitions) {
    if ((t.from === "degraded" || t.from === "critical" || t.from === "healing" || t.from === "cooldown") && t.to === "healthy") {
      foundHealthyRecovery = true;
    }
    if (foundHealthyRecovery && (t.to === "degraded" || t.to === "critical")) {
      return true;
    }
  }
  return false;
}

/**
 * Export all transitions as structured data for analysis.
 */
export function exportTransitions(sm: SubSystemStateMachine): StateTransition[] {
  return [...sm.transitionLog];
}
