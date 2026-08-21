import { createHash } from 'node:crypto';

export type TickFailureFamily =
  | 'runtime_source'
  | 'system_exception'
  | 'state_invariant'
  | 'determinism'
  | 'persistence'
  | 'ordering'
  | 'unknown';

export type TickFailureStage =
  | 'world_state'
  | 'system_tick'
  | 'snapshot_finalize'
  | 'persistence_tick'
  | 'scheduled_tick';

export type TickFailureOrigin = 'runtime' | 'diagnostic_probe';
export type TickFailureRerunOutcome = 'not_eligible' | 'recovered' | 'reproduced' | 'changed_failure';

export interface TickFailureInput {
  readonly tick: number;
  readonly stage: TickFailureStage;
  readonly error: unknown;
  readonly system?: string | null;
  readonly provider?: string | null;
  readonly rerunEligible?: boolean;
}

export interface TickFailureDerivation {
  readonly family: TickFailureFamily;
  readonly origin: TickFailureOrigin;
  readonly code: string;
  readonly errorName: string;
  readonly normalizedMessage: string;
  readonly signals: readonly string[];
  readonly fingerprint: string;
  readonly runId: string | null;
  readonly caseId: string | null;
}

export interface TickFailureRecord extends TickFailureDerivation {
  readonly stage: TickFailureStage;
  readonly system: string | null;
  readonly provider: string | null;
  readonly firstTick: number;
  readonly lastTick: number;
  readonly occurrenceCount: number;
  readonly derivationRerunMatches: boolean;
  readonly rerunEligible: boolean;
  readonly rerunAttempts: number;
  readonly lastRerunOutcome: TickFailureRerunOutcome;
  readonly lastRerunTick: number | null;
  readonly lastRerunFingerprint: string | null;
  readonly lastRunId: string | null;
  readonly lastCaseId: string | null;
}

export interface TickFailureFamilySnapshot {
  /** Organic runtime health only. Diagnostic exercises never poison this status. */
  readonly status: 'clean' | 'observed';
  readonly totalOccurrences: number;
  readonly runtimeOccurrences: number;
  readonly diagnosticOccurrences: number;
  readonly distinctFailures: number;
  readonly lastFailureTick: number | null;
  readonly lastRuntimeFailureTick: number | null;
  readonly lastHealthyTick: number | null;
  /** All observations, including diagnostic probe runs. */
  readonly families: Readonly<Record<TickFailureFamily, number>>;
  readonly runtimeFamilies: Readonly<Record<TickFailureFamily, number>>;
  readonly diagnosticFamilies: Readonly<Record<TickFailureFamily, number>>;
  readonly records: readonly TickFailureRecord[];
}

type MutableFailureRecord = {
  family: TickFailureFamily;
  origin: TickFailureOrigin;
  code: string;
  errorName: string;
  normalizedMessage: string;
  signals: readonly string[];
  fingerprint: string;
  runId: string | null;
  caseId: string | null;
  lastRunId: string | null;
  lastCaseId: string | null;
  stage: TickFailureStage;
  system: string | null;
  provider: string | null;
  firstTick: number;
  lastTick: number;
  occurrenceCount: number;
  derivationRerunMatches: boolean;
  rerunEligible: boolean;
  rerunAttempts: number;
  lastRerunOutcome: TickFailureRerunOutcome;
  lastRerunTick: number | null;
  lastRerunFingerprint: string | null;
};

const MAX_FAILURE_RECORDS = 256;

const CODE_FAMILY: Readonly<Record<string, TickFailureFamily>> = Object.freeze({
  MISSING_RUNTIME_SOURCE: 'runtime_source',
  WORLD_STATE_PROVIDER_FAILURE: 'runtime_source',
  STATE_INVARIANT: 'state_invariant',
  NON_FINITE_STATE: 'state_invariant',
  KAPPA_INVARIANT: 'state_invariant',
  DETERMINISM_DIVERGENCE: 'determinism',
  WORLD_HASH_MISMATCH: 'determinism',
  REPLAY_DIVERGENCE: 'determinism',
  PERSISTENCE_UNAVAILABLE: 'persistence',
  PERSISTENCE_WRITE_FAILURE: 'persistence',
  TICK_ORDER_VIOLATION: 'ordering',
  MISSING_REQUIRED_TICK_SYSTEM: 'ordering',
  DUPLICATE_TICK_SYSTEM: 'ordering',
  TRANSIENT_SYSTEM_FAILURE: 'system_exception',
  SYSTEM_EXCEPTION: 'system_exception',
});

function emptyFamilyCounts(): Record<TickFailureFamily, number> {
  return {
    runtime_source: 0,
    system_exception: 0,
    state_invariant: 0,
    determinism: 0,
    persistence: 0,
    ordering: 0,
    unknown: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMessage(value: unknown): string {
  return String(value ?? 'unknown error')
    .toLowerCase()
    .replace(/[0-9a-f]{16,}/g, '<hex>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

function errorDescriptor(error: unknown): {
  readonly code: string;
  readonly errorName: string;
  readonly message: string;
  readonly origin: TickFailureOrigin;
  readonly runId: string | null;
  readonly caseId: string | null;
} {
  const record = asRecord(error);
  const message = error instanceof Error ? error.message : cleanString(record.message) ?? String(error ?? 'unknown error');
  const errorName = error instanceof Error ? error.name : cleanString(record.name) ?? 'Error';
  const code = (cleanString(record.code) ?? 'SYSTEM_EXCEPTION').toUpperCase();
  return {
    code,
    errorName,
    message,
    origin: record.failureFamilyProbe === true ? 'diagnostic_probe' : 'runtime',
    runId: cleanString(record.failureFamilyRunId),
    caseId: cleanString(record.failureFamilyCaseId),
  };
}

function deriveFamily(input: TickFailureInput, code: string, normalizedMessage: string): { family: TickFailureFamily; signals: string[] } {
  // Hard truth-boundary stages take precedence over the generic fallback code.
  if (input.stage === 'world_state') {
    return { family: 'runtime_source', signals: ['stage:world_state', ...(CODE_FAMILY[code] ? [`code:${code}`] : [])] };
  }
  if (input.stage === 'persistence_tick') {
    return { family: 'persistence', signals: ['stage:persistence_tick', ...(CODE_FAMILY[code] ? [`code:${code}`] : [])] };
  }
  // Snapshot finalization is a state-integrity boundary for an untyped Error.
  // Explicit codes such as DETERMINISM_DIVERGENCE remain more specific and are
  // handled by CODE_FAMILY below.
  if (input.stage === 'snapshot_finalize' && code === 'SYSTEM_EXCEPTION') {
    return { family: 'state_invariant', signals: ['stage:snapshot_finalize', 'code:SYSTEM_EXCEPTION'] };
  }

  const direct = CODE_FAMILY[code];
  if (direct) return { family: direct, signals: [`code:${code}`] };

  const haystack = [input.stage, input.system, input.provider, code, normalizedMessage].filter(Boolean).join('|').toLowerCase();
  if (haystack.includes('runtime source') || haystack.includes('provider')) {
    return { family: 'runtime_source', signals: ['message:runtime_source'] };
  }
  if (haystack.includes('persist') || haystack.includes('postgres') || haystack.includes('redis') || haystack.includes('database')) {
    return { family: 'persistence', signals: ['message:persistence'] };
  }
  if (haystack.includes('determin') || haystack.includes('world_hash') || haystack.includes('world hash') || haystack.includes('diverg') || haystack.includes('replay')) {
    return { family: 'determinism', signals: ['message:determinism'] };
  }
  if (haystack.includes('order') || haystack.includes('dependency') || haystack.includes('duplicate') || haystack.includes('required tick system')) {
    return { family: 'ordering', signals: ['message:ordering'] };
  }
  if (haystack.includes('invariant') || haystack.includes('non-finite') || haystack.includes('nan') || haystack.includes('kappa')) {
    return { family: 'state_invariant', signals: ['message:state_invariant'] };
  }
  if (input.stage === 'snapshot_finalize') return { family: 'state_invariant', signals: ['stage:snapshot_finalize'] };
  if (input.stage === 'system_tick') return { family: 'system_exception', signals: ['stage:system_tick'] };
  return { family: 'unknown', signals: ['fallback:unknown'] };
}

function stableFingerprint(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export function deriveTickFailure(input: TickFailureInput): TickFailureDerivation {
  const descriptor = errorDescriptor(input.error);
  const normalizedMessage = normalizeMessage(descriptor.message);
  const derived = deriveFamily(input, descriptor.code, normalizedMessage);
  const system = cleanString(input.system) ?? '';
  const provider = cleanString(input.provider) ?? '';
  const fingerprint = stableFingerprint([
    descriptor.origin,
    derived.family,
    input.stage,
    system,
    provider,
    descriptor.code,
    descriptor.errorName,
    normalizedMessage,
  ]);

  return Object.freeze({
    family: derived.family,
    origin: descriptor.origin,
    code: descriptor.code,
    errorName: descriptor.errorName,
    normalizedMessage,
    signals: Object.freeze([...derived.signals]),
    fingerprint,
    runId: descriptor.runId,
    caseId: descriptor.caseId,
  });
}

function freezeRecord(record: MutableFailureRecord): TickFailureRecord {
  return Object.freeze({ ...record, signals: Object.freeze([...record.signals]) });
}

export class TickFailureFamilyRuntime {
  private readonly records = new Map<string, MutableFailureRecord>();
  private totalOccurrences = 0;
  private runtimeOccurrences = 0;
  private diagnosticOccurrences = 0;
  private lastFailureTick: number | null = null;
  private lastRuntimeFailureTick: number | null = null;
  private lastHealthyTick: number | null = null;

  recordFailure(input: TickFailureInput): TickFailureRecord {
    const first = deriveTickFailure(input);
    const rerun = deriveTickFailure(input);
    const derivationRerunMatches = first.fingerprint === rerun.fingerprint && first.family === rerun.family;
    const tick = Math.max(0, Math.trunc(Number(input.tick) || 0));
    this.totalOccurrences += 1;
    this.lastFailureTick = tick;
    if (first.origin === 'diagnostic_probe') {
      this.diagnosticOccurrences += 1;
    } else {
      this.runtimeOccurrences += 1;
      this.lastRuntimeFailureTick = tick;
    }

    const existing = this.records.get(first.fingerprint);
    if (existing) {
      existing.lastTick = tick;
      existing.occurrenceCount += 1;
      existing.derivationRerunMatches = existing.derivationRerunMatches && derivationRerunMatches;
      existing.rerunEligible = existing.rerunEligible || input.rerunEligible === true;
      if (first.runId !== null) existing.lastRunId = first.runId;
      if (first.caseId !== null) existing.lastCaseId = first.caseId;
      return freezeRecord(existing);
    }

    const next: MutableFailureRecord = {
      ...first,
      lastRunId: first.runId,
      lastCaseId: first.caseId,
      stage: input.stage,
      system: cleanString(input.system),
      provider: cleanString(input.provider),
      firstTick: tick,
      lastTick: tick,
      occurrenceCount: 1,
      derivationRerunMatches,
      rerunEligible: input.rerunEligible === true,
      rerunAttempts: 0,
      lastRerunOutcome: 'not_eligible',
      lastRerunTick: null,
      lastRerunFingerprint: null,
    };
    this.records.set(first.fingerprint, next);
    this.prune();
    return freezeRecord(next);
  }

  recordRerunOutcome(input: {
    readonly fingerprint: string;
    readonly tick: number;
    readonly outcome: Exclude<TickFailureRerunOutcome, 'not_eligible'>;
    readonly error?: unknown;
    readonly stage?: TickFailureStage;
    readonly system?: string | null;
    readonly provider?: string | null;
  }): TickFailureRecord | null {
    const record = this.records.get(input.fingerprint);
    if (!record) return null;
    record.rerunAttempts += 1;
    record.lastRerunOutcome = input.outcome;
    record.lastRerunTick = Math.max(0, Math.trunc(Number(input.tick) || 0));
    if (input.error !== undefined) {
      record.lastRerunFingerprint = deriveTickFailure({
        tick: input.tick,
        stage: input.stage ?? record.stage,
        error: input.error,
        system: input.system ?? record.system,
        provider: input.provider ?? record.provider,
        rerunEligible: true,
      }).fingerprint;
    } else {
      record.lastRerunFingerprint = null;
    }
    return freezeRecord(record);
  }

  recordHealthyTick(tick: number): void {
    const normalized = Math.max(0, Math.trunc(Number(tick) || 0));
    this.lastHealthyTick = this.lastHealthyTick === null ? normalized : Math.max(this.lastHealthyTick, normalized);
  }

  getSnapshot(): TickFailureFamilySnapshot {
    const familyCounts = emptyFamilyCounts();
    const runtimeFamilyCounts = emptyFamilyCounts();
    const diagnosticFamilyCounts = emptyFamilyCounts();
    const records = [...this.records.values()]
      .sort((a, b) => b.lastTick - a.lastTick || a.fingerprint.localeCompare(b.fingerprint))
      .map(freezeRecord);
    for (const record of records) {
      familyCounts[record.family] += record.occurrenceCount;
      if (record.origin === 'diagnostic_probe') diagnosticFamilyCounts[record.family] += record.occurrenceCount;
      else runtimeFamilyCounts[record.family] += record.occurrenceCount;
    }
    return Object.freeze({
      status: this.runtimeOccurrences === 0 ? 'clean' : 'observed',
      totalOccurrences: this.totalOccurrences,
      runtimeOccurrences: this.runtimeOccurrences,
      diagnosticOccurrences: this.diagnosticOccurrences,
      distinctFailures: records.length,
      lastFailureTick: this.lastFailureTick,
      lastRuntimeFailureTick: this.lastRuntimeFailureTick,
      lastHealthyTick: this.lastHealthyTick,
      families: Object.freeze({ ...familyCounts }),
      runtimeFamilies: Object.freeze({ ...runtimeFamilyCounts }),
      diagnosticFamilies: Object.freeze({ ...diagnosticFamilyCounts }),
      records: Object.freeze(records),
    });
  }

  clear(): void {
    this.records.clear();
    this.totalOccurrences = 0;
    this.runtimeOccurrences = 0;
    this.diagnosticOccurrences = 0;
    this.lastFailureTick = null;
    this.lastRuntimeFailureTick = null;
    this.lastHealthyTick = null;
  }

  private prune(): void {
    if (this.records.size <= MAX_FAILURE_RECORDS) return;
    const oldest = [...this.records.values()]
      .sort((a, b) => a.lastTick - b.lastTick || a.fingerprint.localeCompare(b.fingerprint))[0];
    if (oldest) this.records.delete(oldest.fingerprint);
  }
}
