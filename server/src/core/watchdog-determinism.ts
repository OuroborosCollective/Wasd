export const WATCHDOG_TICK_HZ = 10 as const;
export const WATCHDOG_TICK_MS = 100 as const;

/**
 * Bump this when hash/stringify/normalization rules change.
 * Set back to 2 if existing snapshots/tests hard-pin the old version.
 */
export const WATCHDOG_DETERMINISM_VERSION = 3 as const;

export const WATCHDOG_MAX_SAFE_TICK = Math.floor(Number.MAX_SAFE_INTEGER / WATCHDOG_TICK_MS);

export const WATCHDOG_STABLE_LIMITS = Object.freeze({
  maxDepth: 12,
  maxArrayLength: 512,
  maxRecordKeys: 256,
  maxTextLength: 4096,
});

export type WatchdogSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'DEBUG'
  | 'INFO'
  | 'WARN'
  | 'WARNING'
  | 'ERROR'
  | 'FATAL';

export type CanonicalWatchdogSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WatchdogTickStamp {
  /** Deterministic 10Hz simulation tick. Never wall-clock based. */
  tick: number;
  /** Monotonic sequence inside the watchdog relay/emitter. */
  seq: number;
  /** Deterministic simulation milliseconds: tick * 100 for 10Hz. */
  timestamp: number;
}

export interface WatchdogEvent {
  type: string;
  severity: WatchdogSeverity | CanonicalWatchdogSeverity;
  /** @deprecated Use origin. Kept for compatibility with older callers. */
  source?: string;
  origin?: string;
  message?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tick?: number;
  seq?: number;
  timestamp?: number;
  channel?: string;
}

export interface DeterministicWatchdogEvent extends WatchdogEvent {
  severity: CanonicalWatchdogSeverity;
  origin: string;
  message: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tick: number;
  seq: number;
  timestamp: number;
  channel: string;
}

export type WatchdogValidationResult =
  | { ok: true; event: WatchdogEvent }
  | { ok: false; reason: string };

type StableTransportValue =
  | null
  | boolean
  | number
  | string
  | StableTransportValue[]
  | { [key: string]: StableTransportValue };

const SEVERITY_MAP: Readonly<Record<string, CanonicalWatchdogSeverity>> = Object.freeze({
  DEBUG: 'LOW',
  INFO: 'LOW',
  LOW: 'LOW',
  WARN: 'MEDIUM',
  WARNING: 'MEDIUM',
  MEDIUM: 'MEDIUM',
  ERROR: 'HIGH',
  HIGH: 'HIGH',
  FATAL: 'CRITICAL',
  CRITICAL: 'CRITICAL',
});

export function toCanonicalWatchdogSeverity(severity: unknown): CanonicalWatchdogSeverity | null {
  if (typeof severity !== 'string') return null;
  return SEVERITY_MAP[severity.trim().toUpperCase()] ?? null;
}

export function createWatchdogTickStamp(tick: number, seq: number): WatchdogTickStamp {
  const safeTick = normalizeWatchdogTick(tick, 0);
  const safeSeq = normalizePositiveInteger(seq, 0);

  return {
    tick: safeTick,
    seq: safeSeq,
    timestamp: safeTick * WATCHDOG_TICK_MS,
  };
}

export function normalizeWatchdogEvent(
  input: WatchdogEvent,
  stamp: WatchdogTickStamp,
  fallbackOrigin = 'SYSTEM_CORE',
): DeterministicWatchdogEvent {
  const severity = toCanonicalWatchdogSeverity(input.severity) ?? 'LOW';
  const type = sanitizeText(input.type, 'watchdog.event');
  const origin = sanitizeText(input.origin || input.source || fallbackOrigin, fallbackOrigin);
  const message = sanitizeText(input.message, type);
  const channel = sanitizeText(input.channel, 'watchdog');
  const payload = normalizeRecord(input.payload);
  const metadata = normalizeRecord(input.metadata);
  const payloadHash = deterministicPayloadHash(payload);

  const normalizedBase: DeterministicWatchdogEvent = {
    ...input,
    type,
    severity,
    source: origin,
    origin,
    message,
    payload,
    metadata: {
      ...metadata,
      determinismVersion: WATCHDOG_DETERMINISM_VERSION,
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      payloadHash,
    },
    channel,
    tick: stamp.tick,
    seq: stamp.seq,
    timestamp: stamp.timestamp,
  };

  return {
    ...normalizedBase,
    metadata: {
      ...normalizedBase.metadata,
      eventFingerprint: createDeterministicEventFingerprint(normalizedBase),
    },
  };
}

export function validateWatchdogEventCandidate(input: unknown): WatchdogValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'Watchdog event must be an object.' };
  }

  if (!isPlainRecord(input)) {
    return { ok: false, reason: 'Watchdog event must be a plain object, not a class instance, Date, Map or Set.' };
  }

  const candidate = input as Partial<WatchdogEvent>;

  if (!candidate.type || typeof candidate.type !== 'string' || candidate.type.trim().length === 0) {
    return { ok: false, reason: 'Watchdog event requires a non-empty string type.' };
  }

  if (!toCanonicalWatchdogSeverity(candidate.severity)) {
    return {
      ok: false,
      reason: 'Watchdog event severity must be LOW, MEDIUM, HIGH, CRITICAL, DEBUG, INFO, WARN, WARNING, ERROR or FATAL.',
    };
  }

  const textValidation = validateOptionalTextFields(candidate);
  if (!textValidation.ok) return textValidation;

  if (candidate.payload !== undefined) {
    const payloadValidation = validateStableRecord(candidate.payload, 'payload');
    if (!payloadValidation.ok) return payloadValidation;
  }

  if (candidate.metadata !== undefined) {
    const metadataValidation = validateStableRecord(candidate.metadata, 'metadata');
    if (!metadataValidation.ok) return metadataValidation;
  }

  if (candidate.tick !== undefined && !isNonNegativeSafeInteger(candidate.tick)) {
    return { ok: false, reason: 'Watchdog event tick must be a non-negative safe integer when provided.' };
  }

  if (candidate.tick !== undefined && candidate.tick > WATCHDOG_MAX_SAFE_TICK) {
    return { ok: false, reason: `Watchdog event tick exceeds max safe deterministic tick ${WATCHDOG_MAX_SAFE_TICK}.` };
  }

  if (candidate.seq !== undefined && !isNonNegativeSafeInteger(candidate.seq)) {
    return { ok: false, reason: 'Watchdog event seq must be a non-negative safe integer when provided.' };
  }

  if (candidate.timestamp !== undefined) {
    if (!isNonNegativeSafeInteger(candidate.timestamp)) {
      return { ok: false, reason: 'Watchdog event timestamp must be a non-negative safe integer when provided.' };
    }

    if (candidate.timestamp % WATCHDOG_TICK_MS !== 0) {
      return { ok: false, reason: 'Watchdog event timestamp must align to the deterministic 100ms tick grid.' };
    }

    if (candidate.tick !== undefined) {
      const expectedTimestamp = candidate.tick * WATCHDOG_TICK_MS;
      if (candidate.timestamp !== expectedTimestamp) {
        return { ok: false, reason: 'Watchdog event timestamp must equal tick * 100ms in strict deterministic mode.' };
      }
    }
  }

  return { ok: true, event: candidate as WatchdogEvent };
}

export function normalizeWatchdogTick(value: unknown, fallback: number): number {
  const normalized = normalizePositiveInteger(value, fallback);
  if (normalized < 0) return fallback;
  if (normalized > WATCHDOG_MAX_SAFE_TICK) return fallback;
  return normalized;
}

/**
 * Compatibility name kept from older code.
 * This actually normalizes non-negative integers, including zero.
 */
export function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < 0) return fallback;

  const floored = Math.floor(value);
  if (!Number.isSafeInteger(floored)) return fallback;

  return floored;
}

export function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = normalizeUnicode(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim();

  if (trimmed.length === 0) return fallback;

  return trimmed.length > WATCHDOG_STABLE_LIMITS.maxTextLength
    ? trimmed.slice(0, WATCHDOG_STABLE_LIMITS.maxTextLength)
    : trimmed;
}

export function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) return {};

  const normalized = normalizeStableTransportValue(value, 0, new WeakSet<object>());

  if (!isPlainRecord(normalized)) return {};
  return normalized as Record<string, unknown>;
}

export function stableStringify(value: unknown): string {
  const normalized = normalizeStableTransportValue(value, 0, new WeakSet<object>());
  return stableStringifyNormalized(normalized);
}

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

export function fnv1a32Hex(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, '0');
}

export function deterministicPayloadHash(payload: unknown): string {
  return fnv1a32Hex(stableStringify(payload));
}

export function createDeterministicEventFingerprint(
  event: Pick<DeterministicWatchdogEvent, 'tick' | 'seq' | 'type' | 'origin' | 'channel' | 'severity' | 'payload'>,
): string {
  return fnv1a32Hex(
    [
      WATCHDOG_DETERMINISM_VERSION,
      event.tick,
      event.seq,
      event.channel,
      event.severity,
      event.type,
      event.origin,
      stableStringify(event.payload),
    ].join(':'),
  );
}

export function compareStableText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isPlainWatchdogRecord(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value);
}

function validateOptionalTextFields(candidate: Partial<WatchdogEvent>): WatchdogValidationResult {
  if (candidate.origin !== undefined && typeof candidate.origin !== 'string') {
    return { ok: false, reason: 'Watchdog event origin must be a string when provided.' };
  }

  if (candidate.source !== undefined && typeof candidate.source !== 'string') {
    return { ok: false, reason: 'Watchdog event source must be a string when provided.' };
  }

  if (candidate.message !== undefined && typeof candidate.message !== 'string') {
    return { ok: false, reason: 'Watchdog event message must be a string when provided.' };
  }

  if (candidate.channel !== undefined && typeof candidate.channel !== 'string') {
    return { ok: false, reason: 'Watchdog event channel must be a string when provided.' };
  }

  return { ok: true, event: candidate as WatchdogEvent };
}

function validateStableRecord(value: unknown, path: string): WatchdogValidationResult {
  if (!isPlainRecord(value)) {
    return { ok: false, reason: `Watchdog event ${path} must be a plain object when provided.` };
  }

  const reason = validateStableValue(value, path, 0, new WeakSet<object>());
  if (reason) return { ok: false, reason };

  return { ok: true, event: { type: 'validation.internal', severity: 'LOW' } };
}

function validateStableValue(
  value: unknown,
  path: string,
  depth: number,
  seen: WeakSet<object>,
): string | null {
  if (depth > WATCHDOG_STABLE_LIMITS.maxDepth) {
    return `Watchdog event ${path} exceeds max deterministic depth ${WATCHDOG_STABLE_LIMITS.maxDepth}.`;
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') {
    if (typeof value === 'string' && value.length > WATCHDOG_STABLE_LIMITS.maxTextLength) {
      return `Watchdog event ${path} exceeds max text length ${WATCHDOG_STABLE_LIMITS.maxTextLength}.`;
    }

    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? null : `Watchdog event ${path} contains a non-finite number.`;
  }

  if (value === undefined) {
    return `Watchdog event ${path} contains undefined, which is not transport-stable.`;
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return `Watchdog event ${path} contains unsupported ${typeof value}.`;
  }

  if (Array.isArray(value)) {
    if (value.length > WATCHDOG_STABLE_LIMITS.maxArrayLength) {
      return `Watchdog event ${path} exceeds max array length ${WATCHDOG_STABLE_LIMITS.maxArrayLength}.`;
    }

    if (seen.has(value)) {
      return `Watchdog event ${path} contains a cyclic array reference.`;
    }

    seen.add(value);

    for (let index = 0; index < value.length; index += 1) {
      const reason = validateStableValue(value[index], `${path}[${index}]`, depth + 1, seen);
      if (reason) return reason;
    }

    seen.delete(value);
    return null;
  }

  if (typeof value === 'object') {
    if (!isPlainRecord(value)) {
      return `Watchdog event ${path} contains a non-plain object.`;
    }

    if (seen.has(value)) {
      return `Watchdog event ${path} contains a cyclic object reference.`;
    }

    seen.add(value);

    const keys = Object.keys(value);

    if (keys.length > WATCHDOG_STABLE_LIMITS.maxRecordKeys) {
      return `Watchdog event ${path} exceeds max record key count ${WATCHDOG_STABLE_LIMITS.maxRecordKeys}.`;
    }

    for (const key of keys) {
      if (key.length > WATCHDOG_STABLE_LIMITS.maxTextLength) {
        return `Watchdog event ${path} contains an overlong key.`;
      }

      const reason = validateStableValue(value[key], `${path}.${key}`, depth + 1, seen);
      if (reason) return reason;
    }

    seen.delete(value);
    return null;
  }

  return `Watchdog event ${path} contains unsupported value.`;
}

function normalizeStableTransportValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): StableTransportValue {
  if (depth > WATCHDOG_STABLE_LIMITS.maxDepth) return '[MaxDepth]';
  if (value === null) return null;

  if (typeof value === 'string') {
    const normalized = normalizeUnicode(value);
    return normalized.length > WATCHDOG_STABLE_LIMITS.maxTextLength
      ? normalized.slice(0, WATCHDOG_STABLE_LIMITS.maxTextLength)
      : normalized;
  }

  if (typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (value === undefined) return '[Undefined]';
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return '[Symbol]';

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const output = value
      .slice(0, WATCHDOG_STABLE_LIMITS.maxArrayLength)
      .map((item) => normalizeStableTransportValue(item, depth + 1, seen));
    seen.delete(value);
    return output;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';

    if (!isPlainRecord(value)) {
      return `[NonPlain:${getObjectTag(value)}]`;
    }

    seen.add(value);

    const output: Record<string, StableTransportValue> = {};
    const keys = Object.keys(value)
      .sort(compareStableText)
      .slice(0, WATCHDOG_STABLE_LIMITS.maxRecordKeys);

    for (const key of keys) {
      const normalizedKey = normalizeUnicode(key);
      const safeKey = normalizedKey.length > WATCHDOG_STABLE_LIMITS.maxTextLength
        ? normalizedKey.slice(0, WATCHDOG_STABLE_LIMITS.maxTextLength)
        : normalizedKey;

      output[safeKey] = normalizeStableTransportValue(value[key], depth + 1, seen);
    }

    seen.delete(value);
    return output;
  }

  return String(value);
}

function stableStringifyNormalized(value: StableTransportValue): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(stableStringifyNormalized).join(',')}]`;
  }

  const keys = Object.keys(value).sort(compareStableText);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringifyNormalized(value[key])}`).join(',')}}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function normalizeUnicode(value: string): string {
  try {
    return value.normalize('NFC');
  } catch {
    return value;
  }
}

function getObjectTag(value: object): string {
  const rawTag = Object.prototype.toString.call(value);
  const match = /^\[object ([^\]]+)\]$/.exec(rawTag);
  return match?.[1] ?? 'Object';
}
