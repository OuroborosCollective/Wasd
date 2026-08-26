import Redis, { type RedisOptions } from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST?.trim() || 'localhost';
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_DB = Number.parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD?.trim();
const REDIS_USERNAME = process.env.REDIS_USERNAME?.trim();
const REDIS_TLS = process.env.REDIS_TLS === 'true';
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'wasd:';

if (!Number.isInteger(REDIS_PORT) || REDIS_PORT <= 0 || REDIS_PORT > 65535) {
  throw new Error(`[Redis] Invalid REDIS_PORT: ${process.env.REDIS_PORT}`);
}

if (!Number.isInteger(REDIS_DB) || REDIS_DB < 0) {
  throw new Error(`[Redis] Invalid REDIS_DB: ${process.env.REDIS_DB}`);
}

/**
 * ARE/WASD Redis Client
 *
 * Design:
 * - fail-fast instead of silently buffering commands forever
 * - deterministic retry backoff, no jitter / Math.random
 * - explicit healthcheck
 * - graceful shutdown
 * - safe logs without leaking credentials
 */
const redisOptions: RedisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  db: REDIS_DB,

  ...(REDIS_USERNAME ? { username: REDIS_USERNAME } : {}),
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
  ...(REDIS_TLS ? { tls: {} } : {}),

  keyPrefix: REDIS_KEY_PREFIX,

  /**
   * Important for game/server determinism:
   * Do not queue unlimited commands while Redis is offline.
   * Broken Redis should be visible immediately.
   */
  enableOfflineQueue: false,

  /**
   * Wait until Redis is actually ready, not only socket-connected.
   */
  enableReadyCheck: true,

  /**
   * Per-command retry limit.
   */
  maxRetriesPerRequest: 3,

  /**
   * Hard connection timeout.
   */
  connectTimeout: 5_000,

  /**
   * Deterministic reconnect delay.
   * No random jitter. No infinite aggressive spam.
   */
  retryStrategy(times: number): number | null {
    if (times > 20) {
      return null;
    }

    return Math.min(times * 100, 2_000);
  },

  /**
   * Safer for normal cache/session usage.
   * Pub/Sub users should create a dedicated duplicated connection.
   */
  autoResubscribe: false,
  autoResendUnfulfilledCommands: false,
};

export const redis = new Redis(redisOptions);

let redisErrorCount = 0;

redis.on('connect', () => {
  console.info(`[Redis] Connecting to ${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`);
});

redis.on('ready', () => {
  console.info(`[Redis] Ready at ${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`);
});

redis.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed');
});

redis.on('end', () => {
  console.warn('[Redis] Connection ended');
});

redis.on('error', (err: Error) => {
  redisErrorCount += 1;

  /**
   * Avoid log floods.
   * First 3 errors are printed, then every 10th.
   */
  if (redisErrorCount <= 3 || redisErrorCount % 10 === 0) {
    console.error('[Redis] Error:', err.message);
  }
});

export async function redisHealthcheck(): Promise<{
  ok: boolean;
  status: string;
  latencyMs?: number;
  error?: string;
}> {
  const started = process.hrtime.bigint();

  try {
    const pong = await redis.ping();
    const ended = process.hrtime.bigint();

    return {
      ok: pong === 'PONG',
      status: redis.status,
      latencyMs: Number((ended - started) / 1_000_000n),
    };
  } catch (error) {
    return {
      ok: false,
      status: redis.status,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeRedis(): Promise<void> {
  if (redis.status === 'end') {
    return;
  }

  try {
    await redis.quit();
    console.info('[Redis] Gracefully closed');
  } catch {
    redis.disconnect();
    console.warn('[Redis] Force disconnected');
  }
}

export function getRedisStatus(): string {
  return redis.status;
}

process.once('SIGINT', () => {
  void closeRedis().finally(() => process.exit(0));
});

process.once('SIGTERM', () => {
  void closeRedis().finally(() => process.exit(0));
});
