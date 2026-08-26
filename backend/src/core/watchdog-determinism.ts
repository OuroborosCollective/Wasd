export const WATCHDOG_TICK_HZ = 10 as const;
export const WATCHDOG_TICK_MS = 100 as const;
export const WATCHDOG_DETERMINISM_VERSION = 3 as const;

export const WATCHDOG_HASH_ALGORITHM = 'FNV1A32_STABLE_UTF16_V1' as const;
export const WATCHDOG_DEFAULT_CHANNEL = 'watchdog' as const;
export const WATCHDOG_DEFAULT_ORIGIN = 'SYSTEM_CORE' as const;
export const WATCHDOG_DEFAULT_TYPE = 'watchdog.event' as const;

export const WATCHDOG_MAX_TEXT_LENGTH = 512 as const;
export const WATCHDOG_MAX_RECORD_DEPTH = 8 as const;
export const WATCHDOG_MAX_RECORD_KEYS = 128 as const;
export const WATCHDOG_MAX_ARRAY_LENGTH = 256 as const;
export const WATCHDOG_MAX_STRING_LENGTH = 2048 as const;

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

export interface WatchdogNormalizationStats {
    truncated: boolean;
    circularReferences: number;
    droppedKeys: number;
    nonPlainObjects: number;
    maxDepthReached: boolean;
}

interface NormalizedRecordResult {
    record: Record<string, unknown>;
    stats: WatchdogNormalizationStats;
}

export function toCanonicalWatchdogSeverity(severity: unknown): CanonicalWatchdogSeverity | null {
    if (typeof severity !== 'string') return null;

    const normalized = severity.trim().toUpperCase();

    if (normalized === 'DEBUG' || normalized === 'INFO') return 'LOW';
    if (normalized === 'WARN' || normalized === 'WARNING') return 'MEDIUM';
    if (normalized === 'ERROR') return 'HIGH';
    if (normalized === 'FATAL') return 'CRITICAL';

    if (
        normalized === 'LOW' ||
        normalized === 'MEDIUM' ||
        normalized === 'HIGH' ||
        normalized === 'CRITICAL'
    ) {
        return normalized;
    }

    return null;
}

export function getWatchdogSeverityRank(severity: CanonicalWatchdogSeverity): number {
    switch (severity) {
        case 'LOW':
            return 1;
        case 'MEDIUM':
            return 2;
        case 'HIGH':
            return 3;
        case 'CRITICAL':
            return 4;
        default:
            return 0;
    }
}

export function createWatchdogTickStamp(tick: number, seq: number): WatchdogTickStamp {
    const safeTick = normalizePositiveInteger(tick, 0);
    const safeSeq = normalizePositiveInteger(seq, 0);

    return {
        tick: safeTick,
        seq: safeSeq,
        timestamp: safeTick * WATCHDOG_TICK_MS,
    };
}

export function createNextWatchdogTickStamp(previous: WatchdogTickStamp, tick = previous.tick): WatchdogTickStamp {
    const safeTick = normalizePositiveInteger(tick, previous.tick);
    const nextSeq = normalizePositiveInteger(previous.seq, 0) + 1;

    return createWatchdogTickStamp(safeTick, nextSeq);
}

export function normalizeWatchdogEvent(
    input: WatchdogEvent,
    stamp: WatchdogTickStamp,
    fallbackOrigin = WATCHDOG_DEFAULT_ORIGIN,
): DeterministicWatchdogEvent {
    const severity = toCanonicalWatchdogSeverity(input.severity) ?? 'LOW';
    const type = sanitizeText(input.type, WATCHDOG_DEFAULT_TYPE);
    const origin = sanitizeText(input.origin || input.source || fallbackOrigin, fallbackOrigin);
    const message = sanitizeText(input.message, type);
    const channel = sanitizeText(input.channel, WATCHDOG_DEFAULT_CHANNEL);

    const normalizedPayload = normalizeRecordWithStats(input.payload);
    const normalizedMetadata = normalizeRecordWithStats(input.metadata);

    const payload = normalizedPayload.record;
    const payloadHash = deterministicPayloadHash(payload);

    const deterministicCoreMetadata: Record<string, unknown> = {
        determinismVersion: WATCHDOG_DETERMINISM_VERSION,
        tickHz: WATCHDOG_TICK_HZ,
        tickMs: WATCHDOG_TICK_MS,
        hashAlgorithm: WATCHDOG_HASH_ALGORITHM,
        payloadHash,
        severityRank: getWatchdogSeverityRank(severity),
    };

    if (normalizedPayload.stats.truncated || normalizedPayload.stats.circularReferences > 0 || normalizedPayload.stats.nonPlainObjects > 0) {
        deterministicCoreMetadata.payloadNormalization = normalizedPayload.stats;
    }

    if (normalizedMetadata.stats.truncated || normalizedMetadata.stats.circularReferences > 0 || normalizedMetadata.stats.nonPlainObjects > 0) {
        deterministicCoreMetadata.metadataNormalization = normalizedMetadata.stats;
    }

    const normalizedEvent: DeterministicWatchdogEvent = {
        ...input,
        type,
        severity,
        source: origin,
        origin,
        message,
        payload,
        metadata: {
            ...normalizedMetadata.record,
            ...deterministicCoreMetadata,
        },
        channel,
        tick: stamp.tick,
        seq: stamp.seq,
        timestamp: stamp.timestamp,
    };

    normalizedEvent.metadata.eventFingerprint = createDeterministicEventFingerprint(normalizedEvent);

    return normalizedEvent;
}

export function validateWatchdogEventCandidate(input: unknown):
    | { ok: true; event: WatchdogEvent }
    | { ok: false; reason: string } {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, reason: 'Watchdog event must be an object.' };
    }

    if (!isPlainRecord(input)) {
        return { ok: false, reason: 'Watchdog event must be a plain object.' };
    }

    const candidate = input as Partial<WatchdogEvent>;

    if (!candidate.type || typeof candidate.type !== 'string' || candidate.type.trim().length === 0) {
        return { ok: false, reason: 'Watchdog event requires a non-empty string type.' };
    }

    if (candidate.type.length > WATCHDOG_MAX_TEXT_LENGTH) {
        return { ok: false, reason: `Watchdog event type must be <= ${WATCHDOG_MAX_TEXT_LENGTH} chars.` };
    }

    if (!toCanonicalWatchdogSeverity(candidate.severity)) {
        return {
            ok: false,
            reason: 'Watchdog event severity must be LOW, MEDIUM, HIGH, CRITICAL, DEBUG, INFO, WARN, WARNING, ERROR or FATAL.',
        };
    }

    if (candidate.origin !== undefined && !isValidOptionalText(candidate.origin)) {
        return { ok: false, reason: 'Watchdog event origin must be a non-empty string when provided.' };
    }

    if (candidate.source !== undefined && !isValidOptionalText(candidate.source)) {
        return { ok: false, reason: 'Watchdog event source must be a non-empty string when provided.' };
    }

    if (candidate.message !== undefined && typeof candidate.message !== 'string') {
        return { ok: false, reason: 'Watchdog event message must be a string when provided.' };
    }

    if (candidate.message !== undefined && candidate.message.length > WATCHDOG_MAX_TEXT_LENGTH) {
        return { ok: false, reason: `Watchdog event message must be <= ${WATCHDOG_MAX_TEXT_LENGTH} chars.` };
    }

    if (candidate.channel !== undefined && !isValidOptionalText(candidate.channel)) {
        return { ok: false, reason: 'Watchdog event channel must be a non-empty string when provided.' };
    }

    if (candidate.payload !== undefined && !isPlainRecord(candidate.payload)) {
        return { ok: false, reason: 'Watchdog event payload must be a plain object when provided.' };
    }

    if (candidate.metadata !== undefined && !isPlainRecord(candidate.metadata)) {
        return { ok: false, reason: 'Watchdog event metadata must be a plain object when provided.' };
    }

    if (candidate.tick !== undefined && !isNonNegativeInteger(candidate.tick)) {
        return { ok: false, reason: 'Watchdog event tick must be a non-negative integer when provided.' };
    }

    if (candidate.seq !== undefined && !isNonNegativeInteger(candidate.seq)) {
        return { ok: false, reason: 'Watchdog event seq must be a non-negative integer when provided.' };
    }

    if (candidate.timestamp !== undefined) {
        if (!isNonNegativeInteger(candidate.timestamp)) {
            return { ok: false, reason: 'Watchdog event timestamp must be a non-negative integer when provided.' };
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

    return {
        ok: true,
        event: candidate as WatchdogEvent,
    };
}

export function normalizePositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    if (value < 0) return fallback;
    return Math.floor(value);
}

export function sanitizeText(value: unknown, fallback: string, maxLength = WATCHDOG_MAX_TEXT_LENGTH): string {
    if (typeof value !== 'string') return fallback;

    const trimmed = value.trim();
    if (trimmed.length === 0) return fallback;

    return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export function normalizeRecord(value: unknown): Record<string, unknown> {
    return normalizeRecordWithStats(value).record;
}

export function stableStringify(value: unknown): string {
    const seen = new WeakSet<object>();

    function stringify(current: unknown, depth: number): string {
        if (current === null) return 'null';
        if (current === undefined) return 'undefined';

        const valueType = typeof current;

        if (valueType === 'bigint') return `"${current.toString()}n"`;
        if (valueType === 'number') return Number.isFinite(current) ? String(current) : '0';
        if (valueType === 'boolean') return current ? 'true' : 'false';
        if (valueType === 'string') return JSON.stringify(truncateString(current, WATCHDOG_MAX_STRING_LENGTH));
        if (valueType === 'symbol') return JSON.stringify(String(current));
        if (valueType === 'function') return '"[Function]"';

        if (depth > WATCHDOG_MAX_RECORD_DEPTH) {
            return '"[MaxDepth]"';
        }

        if (Array.isArray(current)) {
            const slice = current.slice(0, WATCHDOG_MAX_ARRAY_LENGTH);
            return `[${slice.map((item) => stringify(item, depth + 1)).join(',')}]`;
        }

        if (valueType === 'object') {
            const objectValue = current as object;

            if (seen.has(objectValue)) {
                return '"[Circular]"';
            }

            if (!isPlainRecord(objectValue)) {
                return JSON.stringify(`[NonPlainObject:${getObjectTag(objectValue)}]`);
            }

            seen.add(objectValue);

            try {
                const record = objectValue as Record<string, unknown>;
                const keys = Object.keys(record).sort(compareStableText).slice(0, WATCHDOG_MAX_RECORD_KEYS);

                return `{${keys
                    .map((key) => `${JSON.stringify(key)}:${stringify(record[key], depth + 1)}`)
                    .join(',')}}`;
            } finally {
                seen.delete(objectValue);
            }
        }

        return JSON.stringify(String(current));
    }

    return stringify(value, 0);
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
    event: Pick<DeterministicWatchdogEvent, 'tick' | 'seq' | 'type' | 'origin' | 'severity' | 'channel' | 'payload'>,
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

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function normalizeRecordWithStats(value: unknown): NormalizedRecordResult {
    const stats: WatchdogNormalizationStats = {
        truncated: false,
        circularReferences: 0,
        droppedKeys: 0,
        nonPlainObjects: 0,
        maxDepthReached: false,
    };

    if (!isPlainRecord(value)) {
        return {
            record: {},
            stats,
        };
    }

    const seen = new WeakSet<object>();
    const normalized = normalizeUnknownValue(value, 0, seen, stats);

    return {
        record: isPlainRecord(normalized) ? normalized : {},
        stats,
    };
}

function normalizeUnknownValue(
    value: unknown,
    depth: number,
    seen: WeakSet<object>,
    stats: WatchdogNormalizationStats,
): unknown {
    if (value === null) return null;
    if (value === undefined) return null;

    const valueType = typeof value;

    if (valueType === 'string') {
        const truncated = truncateString(value, WATCHDOG_MAX_STRING_LENGTH);
        if (truncated.length !== value.length) stats.truncated = true;
        return truncated;
    }

    if (valueType === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (valueType === 'boolean') {
        return value;
    }

    if (valueType === 'bigint') {
        return `${value.toString()}n`;
    }

    if (valueType === 'symbol') {
        return String(value);
    }

    if (valueType === 'function') {
        stats.nonPlainObjects += 1;
        return '[Function]';
    }

    if (depth > WATCHDOG_MAX_RECORD_DEPTH) {
        stats.truncated = true;
        stats.maxDepthReached = true;
        return '[MaxDepth]';
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) {
            stats.circularReferences += 1;
            return '[Circular]';
        }

        seen.add(value);

        try {
            const slice = value.slice(0, WATCHDOG_MAX_ARRAY_LENGTH);
            if (slice.length !== value.length) stats.truncated = true;

            return slice.map((item) => normalizeUnknownValue(item, depth + 1, seen, stats));
        } finally {
            seen.delete(value);
        }
    }

    if (valueType === 'object') {
        const objectValue = value as object;

        if (seen.has(objectValue)) {
            stats.circularReferences += 1;
            return '[Circular]';
        }

        if (!isPlainRecord(objectValue)) {
            stats.nonPlainObjects += 1;
            return `[NonPlainObject:${getObjectTag(objectValue)}]`;
        }

        seen.add(objectValue);

        try {
            const record = objectValue as Record<string, unknown>;
            const keys = Object.keys(record).sort(compareStableText);

            if (keys.length > WATCHDOG_MAX_RECORD_KEYS) {
                stats.truncated = true;
                stats.droppedKeys += keys.length - WATCHDOG_MAX_RECORD_KEYS;
            }

            const normalized: Record<string, unknown> = Object.create(null);

            for (const key of keys.slice(0, WATCHDOG_MAX_RECORD_KEYS)) {
                const safeKey = truncateString(key, WATCHDOG_MAX_TEXT_LENGTH);
                if (safeKey.length !== key.length) stats.truncated = true;

                normalized[safeKey] = normalizeUnknownValue(record[key], depth + 1, seen, stats);
            }

            return normalized;
        } finally {
            seen.delete(objectValue);
        }
    }

    return String(value);
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isValidOptionalText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= WATCHDOG_MAX_TEXT_LENGTH;
}

function truncateString(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getObjectTag(value: object): string {
    return Object.prototype.toString.call(value).slice(8, -1);
    }
