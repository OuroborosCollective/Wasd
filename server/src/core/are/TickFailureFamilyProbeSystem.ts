import {
  TickSystemPriority,
  type TickSystem,
  type TickSystemContext,
  type TickSystemDescriptor,
} from './TickSystem.js';
import { tickSystemRegistry, type TickSystemRegistry } from './TickSystemRegistry.js';
import type { TickFailureFamily } from './TickFailureFamilyRuntime.js';

export const TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME = 'failure-family-probe' as const;

export type FailureFamilyProbeMode = 'reproduce' | 'recover_on_rerun';

export interface FailureFamilyProbeCase {
  readonly caseId: string;
  readonly family: TickFailureFamily;
  readonly code: string;
  readonly message: string;
  readonly mode: FailureFamilyProbeMode;
}

export interface FailureFamilyProbeRunStatus {
  readonly active: boolean;
  readonly runId: string | null;
  readonly queuedCases: number;
  readonly completedCases: number;
  readonly totalCases: number;
  readonly startedAtTick: number | null;
  readonly lastExecutedTick: number | null;
}

type MutableProbeCase = FailureFamilyProbeCase & { attempts: number };

export const DEFAULT_FAILURE_FAMILY_PROBE_CASES: readonly FailureFamilyProbeCase[] = Object.freeze([
  Object.freeze({
    caseId: 'runtime-source-missing',
    family: 'runtime_source' as const,
    code: 'MISSING_RUNTIME_SOURCE',
    message: 'diagnostic runtime source unavailable',
    mode: 'reproduce' as const,
  }),
  Object.freeze({
    caseId: 'state-invariant',
    family: 'state_invariant' as const,
    code: 'STATE_INVARIANT',
    message: 'diagnostic non-finite state invariant',
    mode: 'reproduce' as const,
  }),
  Object.freeze({
    caseId: 'determinism-divergence',
    family: 'determinism' as const,
    code: 'DETERMINISM_DIVERGENCE',
    message: 'diagnostic deterministic rerun divergence',
    mode: 'reproduce' as const,
  }),
  Object.freeze({
    caseId: 'persistence-unavailable',
    family: 'persistence' as const,
    code: 'PERSISTENCE_UNAVAILABLE',
    message: 'diagnostic persistence adapter unavailable',
    mode: 'reproduce' as const,
  }),
  Object.freeze({
    caseId: 'tick-order',
    family: 'ordering' as const,
    code: 'TICK_ORDER_VIOLATION',
    message: 'diagnostic tick system order violation',
    mode: 'reproduce' as const,
  }),
  Object.freeze({
    caseId: 'transient-system-recovery',
    family: 'system_exception' as const,
    code: 'TRANSIENT_SYSTEM_FAILURE',
    message: 'diagnostic transient tick system failure',
    mode: 'recover_on_rerun' as const,
  }),
]);

export class TickFailureFamilyProbeError extends Error {
  readonly failureFamilyProbe = true;
  readonly failureFamilyRunId: string;
  readonly failureFamilyCaseId: string;
  readonly code: string;

  constructor(runId: string, probe: FailureFamilyProbeCase) {
    super(probe.message);
    this.name = 'TickFailureFamilyProbeError';
    this.code = probe.code;
    this.failureFamilyRunId = runId;
    this.failureFamilyCaseId = probe.caseId;
  }
}

export class TickFailureFamilyProbeSystem implements TickSystem {
  readonly id = TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME;
  readonly name = TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME;
  readonly priority = TickSystemPriority.BACKGROUND;
  enabled = true;

  private runSequence = 0;
  private runId: string | null = null;
  private queue: MutableProbeCase[] = [];
  private completedCases = 0;
  private totalCases = 0;
  private startedAtTick: number | null = null;
  private lastExecutedTick: number | null = null;

  armFullRun(input: { readonly requestedRunId?: string | null; readonly currentTick?: number | null } = {}): FailureFamilyProbeRunStatus {
    if (this.queue.length > 0) return this.getStatus();
    this.runSequence += 1;
    const requested = typeof input.requestedRunId === 'string' ? input.requestedRunId.trim() : '';
    const currentTick = Number.isSafeInteger(Number(input.currentTick)) ? Math.max(0, Number(input.currentTick)) : 0;
    this.runId = requested || `failure-family-run-${currentTick}-${this.runSequence}`;
    this.queue = DEFAULT_FAILURE_FAMILY_PROBE_CASES.map((probe) => ({ ...probe, attempts: 0 }));
    this.completedCases = 0;
    this.totalCases = this.queue.length;
    this.startedAtTick = null;
    this.lastExecutedTick = null;
    return this.getStatus();
  }

  tick(context: TickSystemContext): void {
    const probe = this.queue[0];
    if (!probe || !this.runId) return;

    const tick = Number(context.tickCount);
    if (this.startedAtTick === null) this.startedAtTick = tick;
    this.lastExecutedTick = tick;
    probe.attempts += 1;

    if (probe.attempts === 1) {
      throw new TickFailureFamilyProbeError(this.runId, probe);
    }

    // The registry is allowed to rerun this diagnostic system once with the
    // exact same context. This probe owns no gameplay state, so the rerun is
    // intentionally side-effect-idempotent except for its private test queue.
    this.queue.shift();
    this.completedCases += 1;
    if (probe.mode === 'recover_on_rerun') return;
    throw new TickFailureFamilyProbeError(this.runId, probe);
  }

  getStatus(): FailureFamilyProbeRunStatus {
    return Object.freeze({
      active: this.queue.length > 0,
      runId: this.runId,
      queuedCases: this.queue.length,
      completedCases: this.completedCases,
      totalCases: this.totalCases,
      startedAtTick: this.startedAtTick,
      lastExecutedTick: this.lastExecutedTick,
    });
  }
}

export function createTickFailureFamilyProbeDescriptor(system = new TickFailureFamilyProbeSystem()): TickSystemDescriptor {
  return {
    system,
    dependencies: [],
    tags: ['diagnostic', 'failure-family', 'rerun-safe'],
    failurePolicy: { rerun: 'safe_same_context_once' },
  };
}

export function registerTickFailureFamilyProbeSystem(
  registry: TickSystemRegistry = tickSystemRegistry,
): TickFailureFamilyProbeSystem {
  const existing = registry.get(TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME);
  if (existing instanceof TickFailureFamilyProbeSystem) return existing;
  const system = new TickFailureFamilyProbeSystem();
  registry.register(createTickFailureFamilyProbeDescriptor(system));
  return system;
}
