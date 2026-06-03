export const WATCHDOG_TICK_HZ = 10 as const;
export const WATCHDOG_TICK_MS = 100 as const;

export type WatchdogSeverity =
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL'
    | 'DEBUG'
    | 'INFO'
    | 'WARN'
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
    severity: CanonicalWatchdogSeverity;
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

export function createWatchdogTickStamp(tick: number, seq: number): WatchdogTickStamp {
    const safeTick = normalizePositiveInteger(tick, 0);
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
    const origin = sanitizeText(input.origin || input.source || fallbackOrigin, fallbackOrigin);
    const message = sanitizeText(input.message, input.type || 'watchdog.event');
    const channel = sanitizeText(input.channel, 'watchdog');

    return {
        ...input,
        type: sanitizeText(input.type, 'watchdog.event'),
        severity,
        source: origin,
        origin,
        message,
        payload: normalizeRecord(input.payload),
        metadata: normalizeRecord(input.metadata),
        channel,
        tick: stamp.tick,
        seq: stamp.seq,
        timestamp: stamp.timestamp,
    };
}

export function validateWatchdogEventCandidate(input: unknown):
    | { ok: true; event: WatchdogEvent }
    | { ok: false; reason: string } {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, reason: 'Watchdog event must be an object.' };
    }

    const candidate = input as Partial<WatchdogEvent>;

    if (!candidate.type || typeof candidate.type !== 'string' || candidate.type.trim().length === 0) {
        return { ok: false, reason: 'Watchdog event requires a non-empty string type.' };
    }

    if (!toCanonicalWatchdogSeverity(candidate.severity)) {
        return { ok: false, reason: 'Watchdog event severity must be LOW, MEDIUM, HIGH, CRITICAL, DEBUG, INFO, WARN, ERROR or FATAL.' };
    }

    if (candidate.origin !== undefined && typeof candidate.origin !== 'string') {
        return { ok: false, reason: 'Watchdog event origin must be a string when provided.' };
    }

    if (candidate.source !== undefined && typeof candidate.source !== 'string') {
        return { ok: false, reason: 'Watchdog event source must be a string when provided.' };
    }

    if (candidate.message !== undefined && typeof candidate.message !== 'string') {
        return { ok: false, reason: 'Watchdog event message must be a string when provided.' };
    }

    if (candidate.payload !== undefined && !isPlainRecord(candidate.payload)) {
        return { ok: false, reason: 'Watchdog event payload must be a plain object when provided.' };
    }

    if (candidate.metadata !== undefined && !isPlainRecord(candidate.metadata)) {
        return { ok: false, reason: 'Watchdog event metadata must be a plain object when provided.' };
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

export function sanitizeText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeRecord(value: unknown): Record<string, unknown> {
    if (!isPlainRecord(value)) return {};
    return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
