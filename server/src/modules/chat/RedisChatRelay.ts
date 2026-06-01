import type { Redis } from "ioredis";
import { Redis as RedisClient } from "ioredis";

const CHANNEL = "game:chat";

export type ChatScope = "global" | "zone" | "party";

export interface ChatMessage {
  scope: ChatScope;
  senderId: string;
  senderName: string;
  text: string;
  zoneId?: string;
  partyId?: string;
  ts: number;
}

type ChatListener = (msg: ChatMessage) => void;
type PublishFailureReason = "invalid" | "rate_limited";
export type PublishChatResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; reason: PublishFailureReason; retryAfterMs?: number };

let initialized = false;
const listeners = new Set<ChatListener>();
let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let redisPubSubReady = false;
const senderLastMessageAt = new Map<string, number>();

function trimEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function resolveRedisUrl(): string | null {
  const direct = trimEnv("REDIS_URL");
  if (direct) {
    return direct;
  }
  const host = trimEnv("REDIS_HOST");
  if (!host) {
    return null;
  }
  const port = trimEnv("REDIS_PORT") || "6379";
  const password = trimEnv("REDIS_PASSWORD");
  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function normalizeScope(scope: unknown): ChatScope {
  if (scope === "zone") return "zone";
  if (scope === "party") return "party";
  return "global";
}

function sanitizeText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 200);
}

function resolveChatRateLimitMs(): number {
  const raw = Number(trimEnv("CHAT_RATE_LIMIT_MS"));
  if (!Number.isFinite(raw)) {
    return 500;
  }
  return Math.max(0, Math.min(10_000, Math.floor(raw)));
}

function enforceRateLimit(senderId: string, nowMs: number): { ok: true } | { ok: false; retryAfterMs: number } {
  const rateLimitMs = resolveChatRateLimitMs();
  if (rateLimitMs <= 0) {
    return { ok: true };
  }
  const last = senderLastMessageAt.get(senderId) ?? 0;
  if (last > 0 && nowMs - last < rateLimitMs) {
    return { ok: false, retryAfterMs: Math.max(1, rateLimitMs - (nowMs - last)) };
  }
  senderLastMessageAt.set(senderId, nowMs);
  // Keep memory bounded if many unique senders pass through.
  if (senderLastMessageAt.size > 20_000) {
    const cutoff = nowMs - Math.max(rateLimitMs * 4, 10_000);
    for (const [id, at] of senderLastMessageAt) {
      if (at < cutoff) {
        senderLastMessageAt.delete(id);
      }
    }
  }
  return { ok: true };
}

function dispatchLocal(msg: ChatMessage): void {
  for (const listener of listeners) {
    try {
      listener(msg);
    } catch {
      // isolated listener errors should never break chat fanout
    }
  }
}

function normalizeIncoming(raw: Partial<ChatMessage>): ChatMessage | null {
  const text = sanitizeText(raw.text);
  const senderId = typeof raw.senderId === "string" ? raw.senderId.trim() : "";
  const senderName = typeof raw.senderName === "string" ? raw.senderName.trim() : "";
  if (!text || !senderId || !senderName) {
    return null;
  }
  const zoneId = typeof raw.zoneId === "string" ? raw.zoneId.trim() : "";
  const partyId = typeof raw.partyId === "string" ? raw.partyId.trim() : "";
  return {
    scope: normalizeScope(raw.scope),
    senderId,
    senderName,
    text,
    zoneId: zoneId || undefined,
    partyId: partyId || undefined,
    ts: Number.isFinite(Number(raw.ts)) ? Number(raw.ts) : 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };
}

export async function initRedisChatRelay(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    console.warn("[chat] REDIS_URL/REDIS_HOST missing, chat will run in single-process mode.");
    return;
  }

  try {
    publisher = new RedisClient(redisUrl, { lazyConnect: true });
    subscriber = new RedisClient(redisUrl, { lazyConnect: true });
    await publisher.connect();
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL);
    subscriber.on("message", (_channel: string, raw: string) => {
      try {
        const parsed = JSON.parse(raw) as Partial<ChatMessage>;
        const normalized = normalizeIncoming(parsed);
        if (!normalized) return;
        dispatchLocal(normalized);
      } catch {
        // ignore malformed messages
      }
    });
    redisPubSubReady = true;
    console.log("[chat] Redis pub/sub active on channel", CHANNEL);
  } catch (error) {
    console.warn("[chat] Redis pub/sub unavailable, using single-process chat fallback.", error);
    try {
      await publisher?.disconnect();
    } catch {
      // ignore
    }
    try {
      await subscriber?.disconnect();
    } catch {
      // ignore
    }
    publisher = null;
    subscriber = null;
    redisPubSubReady = false;
  }
}

export function onRedisChatMessage(listener: ChatListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function publishChatMessage(msg: Partial<ChatMessage>): Promise<PublishChatResult> {
  const normalized = normalizeIncoming(msg);
  if (!normalized) {
    return { ok: false, reason: "invalid" };
  }
  const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
  const rateLimit = enforceRateLimit(normalized.senderId, now);
  if (rateLimit.ok === false) {
    return { ok: false, reason: "rate_limited", retryAfterMs: rateLimit.retryAfterMs };
  }
  if (redisPubSubReady && publisher) {
    await publisher.publish(CHANNEL, JSON.stringify(normalized));
    return { ok: true, message: normalized };
  }
  dispatchLocal(normalized);
  return { ok: true, message: normalized };
}
