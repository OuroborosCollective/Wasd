import { RawData, WebSocket, WebSocketServer } from 'ws';
import {
    WATCHDOG_TICK_HZ,
    WATCHDOG_TICK_MS,
    createWatchdogTickStamp,
    normalizePositiveInteger,
    normalizeWatchdogEvent,
    validateWatchdogEventCandidate,
    type DeterministicWatchdogEvent,
} from './core/watchdog-determinism';

/**
 * Watchdog Server - Areloria WASD Core Component
 *
 * Deterministic 10Hz relay for system events, world-tick telemetry,
 * CI diagnostics, GM dashboards and self-heal consumers.
 *
 * Rule: accepted event timestamps are derived from tick * 100ms.
 */

type ClientRole = 'unknown' | 'agent' | 'dashboard' | 'logger' | 'ci' | 'selfheal' | 'gm' | 'world';

interface WatchdogClientMeta {
    id: number;
    ip: string;
    role: ClientRole;
    alive: boolean;
    receivedEvents: number;
    relayedEvents: number;
    rejectedEvents: number;
    lastAcceptedTick: number;
}

const PORT = readPort(process.env.WATCHDOG_PORT, 8080);
const HOST = process.env.WATCHDOG_HOST || '0.0.0.0';
const MAX_PAYLOAD_BYTES = readInt(process.env.WATCHDOG_MAX_PAYLOAD_BYTES, 64 * 1024);
const HEARTBEAT_INTERVAL_MS = readInt(process.env.WATCHDOG_HEARTBEAT_INTERVAL_MS, WATCHDOG_TICK_MS * 300);
const MAX_BUFFERED_AMOUNT = readInt(process.env.WATCHDOG_MAX_BUFFERED_AMOUNT, 512 * 1024);
const ENABLE_ECHO_TO_SENDER = readBool(process.env.WATCHDOG_ECHO_TO_SENDER, false);
const STRICT_TICK_MODE = readBool(process.env.WATCHDOG_STRICT_TICK_MODE, true);
const MAX_TICK_JUMP = readInt(process.env.WATCHDOG_MAX_TICK_JUMP, WATCHDOG_TICK_HZ * 60);

let nextClientId = 1;
let relaySeq = 0;
let relayTick = 0;
let totalReceived = 0;
let totalRelayed = 0;
let totalRejected = 0;
let shuttingDown = false;

const clients = new Map<WebSocket, WatchdogClientMeta>();

const wss = new WebSocketServer({
    host: HOST,
    port: PORT,
    maxPayload: MAX_PAYLOAD_BYTES,
});

console.log(`[Watchdog Server] Started on ws://${HOST}:${PORT}`);
console.log(`[Watchdog Server] Deterministic tick: ${WATCHDOG_TICK_HZ}Hz / ${WATCHDOG_TICK_MS}ms`);
console.log(`[Watchdog Server] Strict tick mode: ${STRICT_TICK_MODE ? 'enabled' : 'disabled'}`);

wss.on('connection', (ws, req) => {
    if (shuttingDown) {
        safeClose(ws, 1012, 'Server shutting down');
        return;
    }

    const ip = req.socket.remoteAddress || 'unknown';
    const url = new URL(req.url || '/', `ws://${req.headers.host || 'localhost'}`);
    const role = normalizeRole(url.searchParams.get('role'));

    const meta: WatchdogClientMeta = {
        id: nextClientId++,
        ip,
        role,
        alive: true,
        receivedEvents: 0,
        relayedEvents: 0,
        rejectedEvents: 0,
        lastAcceptedTick: 0,
    };

    clients.set(ws, meta);

    console.log(`[Watchdog Server] Client #${meta.id} connected from ${meta.ip} role=${meta.role}`);

    sendSystemEvent(ws, {
        type: 'watchdog.connected',
        severity: 'LOW',
        origin: 'watchdog-server',
        message: 'Connected to Areloria deterministic watchdog relay',
        payload: {},
        metadata: {
            clientId: meta.id,
            role: meta.role,
            tickHz: WATCHDOG_TICK_HZ,
            tickMs: WATCHDOG_TICK_MS,
            strictTickMode: STRICT_TICK_MODE,
            maxPayloadBytes: MAX_PAYLOAD_BYTES,
        },
        channel: 'watchdog.system',
    });

    ws.on('pong', () => {
        const current = clients.get(ws);
        if (current) current.alive = true;
    });

    ws.on('message', (data) => {
        handleMessage(ws, data);
    });

    ws.on('error', (err) => {
        const current = clients.get(ws);
        console.error(`[Watchdog Server] Socket error client #${current?.id ?? 'unknown'} ${ip}: ${err.message}`);
        if (err.stack) console.error(`[Watchdog Server] Stacktrace:\n${err.stack}`);
    });

    ws.on('close', (code, reason) => {
        const current = clients.get(ws);
        clients.delete(ws);
        console.log(`[Watchdog Server] Client #${current?.id ?? 'unknown'} ${ip} disconnected. Code=${code} Reason=${reason.toString() || 'none'}`);
    });
});

wss.on('error', (err) => {
    console.error('[Watchdog Server] FATAL SERVER ERROR:');
    console.error(`[Watchdog Server] Message: ${err.message}`);
    if (err.stack) console.error(`[Watchdog Server] Stacktrace:\n${err.stack}`);
});

const heartbeatTimer = setInterval(() => {
    for (const [ws, meta] of clients.entries()) {
        if (ws.readyState !== WebSocket.OPEN) {
            clients.delete(ws);
            continue;
        }

        if (!meta.alive) {
            console.warn(`[Watchdog Server] Terminating stale client #${meta.id} ${meta.ip}`);
            clients.delete(ws);
            ws.terminate();
            continue;
        }

        meta.alive = false;

        try {
            ws.ping();
        } catch (err) {
            console.error(`[Watchdog Server] Failed to ping client #${meta.id}: ${toErrorMessage(err)}`);
            clients.delete(ws);
            ws.terminate();
        }
    }
}, HEARTBEAT_INTERVAL_MS);

function handleMessage(sender: WebSocket, data: RawData): void {
    const senderMeta = clients.get(sender);

    if (!senderMeta) {
        safeClose(sender, 1008, 'Unregistered client');
        return;
    }

    senderMeta.receivedEvents += 1;
    totalReceived += 1;

    const payloadSize = getPayloadSize(data);

    if (payloadSize > MAX_PAYLOAD_BYTES) {
        rejectClientEvent(sender, senderMeta, 'watchdog.payload_too_large', `Payload exceeds max size ${MAX_PAYLOAD_BYTES} bytes`, {
            payloadSize,
            maxPayloadBytes: MAX_PAYLOAD_BYTES,
        });
        return;
    }

    const rawData = data.toString('utf8');
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawData);
    } catch (err) {
        rejectClientEvent(sender, senderMeta, 'watchdog.invalid_json', 'Invalid JSON payload', {
            error: toErrorMessage(err),
            rawPreview: rawData.slice(0, 512),
        });
        return;
    }

    const validation = validateWatchdogEventCandidate(parsed);

    if (!validation.ok) {
        rejectClientEvent(sender, senderMeta, 'watchdog.invalid_event', validation.reason, {
            rawPreview: rawData.slice(0, 512),
        });
        return;
    }

    const incomingTick = normalizePositiveInteger(validation.event.tick, relayTick);

    if (STRICT_TICK_MODE && incomingTick < senderMeta.lastAcceptedTick) {
        rejectClientEvent(sender, senderMeta, 'watchdog.tick_rewind', 'Rejected non-monotonic watchdog tick for this client', {
            incomingTick,
            lastAcceptedTick: senderMeta.lastAcceptedTick,
        });
        return;
    }

    if (STRICT_TICK_MODE && incomingTick > senderMeta.lastAcceptedTick + MAX_TICK_JUMP && senderMeta.lastAcceptedTick > 0) {
        rejectClientEvent(sender, senderMeta, 'watchdog.tick_jump', 'Rejected watchdog tick jump beyond configured window', {
            incomingTick,
            lastAcceptedTick: senderMeta.lastAcceptedTick,
            maxTickJump: MAX_TICK_JUMP,
        });
        return;
    }

    relayTick = Math.max(relayTick, incomingTick);
    senderMeta.lastAcceptedTick = incomingTick;

    const stamp = createWatchdogTickStamp(relayTick, ++relaySeq);
    const event = normalizeWatchdogEvent(validation.event, stamp, `client#${senderMeta.id}:${senderMeta.role}`);

    logEvent(event, senderMeta);

    const delivered = broadcast(sender, JSON.stringify(event));
    senderMeta.relayedEvents += delivered;
    totalRelayed += delivered;
}

function broadcast(sender: WebSocket, payload: string): number {
    let delivered = 0;

    for (const [client, meta] of clients.entries()) {
        if (!ENABLE_ECHO_TO_SENDER && client === sender) continue;
        if (client.readyState !== WebSocket.OPEN) continue;

        if (client.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            console.warn(`[Watchdog Server] Skipping slow client #${meta.id}. bufferedAmount=${client.bufferedAmount}`);
            continue;
        }

        try {
            client.send(payload);
            delivered += 1;
        } catch (err) {
            console.error(`[Watchdog Server] Failed to relay to client #${meta.id}: ${toErrorMessage(err)}`);
        }
    }

    return delivered;
}

function rejectClientEvent(
    ws: WebSocket,
    meta: WatchdogClientMeta,
    type: string,
    message: string,
    metadata?: Record<string, unknown>,
): void {
    meta.rejectedEvents += 1;
    totalRejected += 1;

    console.warn(`[Watchdog Server] Rejected event from client #${meta.id}: ${message}`);

    sendSystemEvent(ws, {
        type,
        severity: 'MEDIUM',
        origin: 'watchdog-server',
        message,
        payload: {},
        metadata: {
            clientId: meta.id,
            ...metadata,
        },
        channel: 'watchdog.reject',
    });
}

function sendSystemEvent(ws: WebSocket, partial: Omit<DeterministicWatchdogEvent, 'tick' | 'seq' | 'timestamp'>): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    const stamp = createWatchdogTickStamp(relayTick, ++relaySeq);
    const event: DeterministicWatchdogEvent = {
        ...partial,
        tick: stamp.tick,
        seq: stamp.seq,
        timestamp: stamp.timestamp,
    };

    try {
        ws.send(JSON.stringify(event));
    } catch (err) {
        console.error(`[Watchdog Server] Failed to send system event: ${toErrorMessage(err)}`);
    }
}

function logEvent(event: DeterministicWatchdogEvent, sender: WatchdogClientMeta): void {
    console.log(
        `[Watchdog Event #${event.seq}] tick=${event.tick} t=${event.timestamp}ms type=${event.type} severity=${event.severity} origin=${event.origin} sender=client#${sender.id}:${sender.role}`,
    );

    if (event.severity === 'CRITICAL') {
        console.error(`[Watchdog ALERT] ${event.type.toUpperCase()}: ${event.message}`);
        if (Object.keys(event.metadata).length > 0) {
            console.error(`[Watchdog Metadata]: ${safeJson(event.metadata)}`);
        }
    }
}

function normalizeRole(value: string | null): ClientRole {
    if (!value) return 'unknown';
    const normalized = value.trim().toLowerCase();

    if (
        normalized === 'agent' ||
        normalized === 'dashboard' ||
        normalized === 'logger' ||
        normalized === 'ci' ||
        normalized === 'selfheal' ||
        normalized === 'gm' ||
        normalized === 'world'
    ) {
        return normalized;
    }

    return 'unknown';
}

function getPayloadSize(data: RawData): number {
    if (typeof data === 'string') return Buffer.byteLength(data);
    if (Buffer.isBuffer(data)) return data.byteLength;
    if (Array.isArray(data)) return data.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    if (data instanceof ArrayBuffer) return data.byteLength;
    return Buffer.byteLength(String(data));
}

function safeJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '[Unserializable metadata]';
    }
}

function safeClose(ws: WebSocket, code: number, reason: string): void {
    try {
        ws.close(code, reason);
    } catch {
        ws.terminate();
    }
}

function toErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
}

function readPort(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65_535) return fallback;
    return parsed;
}

function readInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
}

function printStats(): void {
    console.log(`[Watchdog Stats] clients=${clients.size} received=${totalReceived} relayed=${totalRelayed} rejected=${totalRejected} relayTick=${relayTick} relaySeq=${relaySeq}`);

    for (const meta of clients.values()) {
        console.log(
            `[Watchdog Client] #${meta.id} ip=${meta.ip} role=${meta.role} alive=${meta.alive} received=${meta.receivedEvents} relayed=${meta.relayedEvents} rejected=${meta.rejectedEvents} lastTick=${meta.lastAcceptedTick}`,
        );
    }
}

async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[Watchdog Server] Received ${signal}. Starting graceful shutdown...`);
    printStats();
    clearInterval(heartbeatTimer);

    for (const [client, meta] of clients.entries()) {
        console.log(`[Watchdog Server] Closing client #${meta.id}`);
        sendSystemEvent(client, {
            type: 'watchdog.shutdown',
            severity: 'LOW',
            origin: 'watchdog-server',
            message: 'Watchdog server is shutting down',
            payload: {},
            metadata: { signal },
            channel: 'watchdog.system',
        });
        safeClose(client, 1001, 'Server shutting down');
    }

    clients.clear();

    await new Promise<void>((resolve) => {
        wss.close((err) => {
            if (err) console.error(`[Watchdog Server] Error during shutdown: ${err.message}`);
            resolve();
        });
    });

    console.log('[Watchdog Server] Shutdown complete.');
    process.exit(0);
}

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

process.on('uncaughtException', (err) => {
    console.error('[Watchdog Server] UNCAUGHT EXCEPTION:');
    console.error(err.stack || err);
    printStats();
    process.exitCode = 1;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Watchdog Server] UNHANDLED REJECTION:');
    console.error('[Watchdog Server] Promise:', promise);
    console.error('[Watchdog Server] Reason:', reason);
    printStats();
    process.exitCode = 1;
});
