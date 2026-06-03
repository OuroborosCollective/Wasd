import { integrityChecker } from './core/integrity-checker';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Sovereign Watchdog Circuit Breaker
 *
 * Ziel:
 * - Kein harter Crash bei transienten DB-Ausfällen
 * - Stabile Retry-/Recovery-Logik
 * - Sauberer Shutdown bei SIGINT/SIGTERM
 * - Prisma-Verbindung kontrolliert halten
 * - Axiom-Synchronisation erst nach DB-Gesundheit
 */

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

type WatchdogError = {
  message?: string;
  code?: string;
  meta?: unknown;
};

const WATCHDOG_RETRY_THRESHOLD = readPositiveInt(
  process.env.WATCHDOG_RETRY_THRESHOLD,
  3,
);

const WATCHDOG_RECOVERY_DELAY_MS = readPositiveInt(
  process.env.WATCHDOG_RECOVERY_DELAY_MS,
  5_000,
);

const WATCHDOG_INITIAL_DB_ATTEMPTS = readPositiveInt(
  process.env.WATCHDOG_INITIAL_DB_ATTEMPTS,
  30,
);

const WATCHDOG_SYNC_RETRY_DELAY_MS = readPositiveInt(
  process.env.WATCHDOG_SYNC_RETRY_DELAY_MS,
  10_000,
);

const WATCHDOG_MODELS_PATH =
  process.env.WATCHDOG_MODELS_PATH || './src/models';

let isShuttingDown = false;

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelayMs(attempt: number): number {
  const base = 1_000;
  const max = 30_000;

  const delay = Math.floor(base * Math.pow(1.5, attempt));

  return Math.min(delay, max);
}

function normalizeError(error: unknown): Required<Pick<WatchdogError, 'message' | 'code'>> {
  if (error instanceof Error) {
    const maybeCode = (error as Error & { code?: string }).code;

    return {
      message: error.message || 'Unknown Error',
      code: maybeCode || 'N/A',
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as WatchdogError;

    return {
      message: err.message || 'Unknown Error',
      code: err.code || 'N/A',
    };
  }

  return {
    message: String(error),
    code: 'N/A',
  };
}

function isDatabaseConnectionError(error: unknown): boolean {
  const { message, code } = normalizeError(error);
  const lowerMessage = message.toLowerCase();

  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'P1001' || // Prisma: Can't reach DB server
    code === 'P1002' || // Prisma: Read timeout
    code === 'P1017' || // Prisma: Server closed connection
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('terminated') ||
    lowerMessage.includes('connection failure') ||
    lowerMessage.includes('connection refused') ||
    lowerMessage.includes('server closed the connection') ||
    lowerMessage.includes('database server at') ||
    lowerMessage.includes('can\'t reach database server')
  );
}

class WatchdogCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private consecutiveSuccesses = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly recoveryDelayMs: number;

  constructor(options?: {
    failureThreshold?: number;
    successThreshold?: number;
    recoveryDelayMs?: number;
  }) {
    this.failureThreshold = options?.failureThreshold ?? WATCHDOG_RETRY_THRESHOLD;
    this.successThreshold = options?.successThreshold ?? 2;
    this.recoveryDelayMs = options?.recoveryDelayMs ?? WATCHDOG_RECOVERY_DELAY_MS;
  }

  async executeHealthCheck(prisma: PrismaClient): Promise<boolean> {
    if (this.state === CircuitState.OPEN) {
      console.warn('⚠️ [Watchdog] Circuit is OPEN. Switching to HALF_OPEN probe mode...');
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      await integrityChecker.checkDatabaseHealth(prisma);
      this.onSuccess();
      return true;
    } catch (error: unknown) {
      this.onFailure(error);
      return false;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses += 1;

      console.log(
        `⏳ [Watchdog] Probe successful (${this.consecutiveSuccesses}/${this.successThreshold})...`,
      );

      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.reset();
      }

      return;
    }

    this.reset();
  }

  private onFailure(error: unknown): void {
    this.consecutiveSuccesses = 0;
    this.failureCount += 1;

    const { message, code } = normalizeError(error);
    const connectionError = isDatabaseConnectionError(error);

    console.error(
      `❌ [Watchdog] Health check failed ` +
        `(Count: ${this.failureCount}/${this.failureThreshold} | Code: ${code}): ${message}`,
    );

    if (connectionError) {
      console.error('📡 [Watchdog] Detected database/network connection problem.');
    }

    if (this.failureCount >= this.failureThreshold || connectionError) {
      this.open();
    }
  }

  private open(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      console.error(
        '🚨 [Watchdog] Circuit Breaker TRIPPED. Entering recovery mode.',
      );
    }
  }

  private reset(): void {
    if (this.state !== CircuitState.CLOSED) {
      console.log(
        '✅ [Watchdog] System recovered. Connection stable. Closing circuit.',
      );
    }

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
  }

  async wait(customMs?: number): Promise<void> {
    await sleep(customMs ?? this.recoveryDelayMs);
  }

  get isDegraded(): boolean {
    return this.state === CircuitState.OPEN;
  }

  get currentState(): CircuitState {
    return this.state;
  }
}

/**
 * Persistente Datenbank-Bereitschaftsprüfung.
 *
 * maxAttempts = 0 bedeutet:
 * - endlos warten
 * - ideal für Container-Recovery
 *
 * maxAttempts > 0 bedeutet:
 * - begrenzt versuchen
 * - danach graceful degradation erlauben
 */
async function waitForDatabase(
  prisma: PrismaClient,
  maxAttempts = 0,
): Promise<boolean> {
  console.log('📡 [Watchdog] Initializing database readiness check...');

  let attempt = 0;

  while (!isShuttingDown) {
    attempt += 1;

    try {
      await prisma.$queryRaw`SELECT 1`;

      console.log('🔗 [Watchdog] Database connection verified.');
      return true;
    } catch (error: unknown) {
      const { message, code } = normalizeError(error);
      const retryIn = getBackoffDelayMs(attempt);

      console.warn(
        `⏳ [Watchdog] Database not ready ` +
          `(Attempt ${attempt}${maxAttempts > 0 ? `/${maxAttempts}` : ''} | Code: ${code}): ` +
          `${message}. Retrying in ${retryIn}ms...`,
      );

      if (maxAttempts > 0 && attempt >= maxAttempts) {
        console.error(
          `💀 [Watchdog] Max database attempts (${maxAttempts}) reached. ` +
            'Graceful degradation requested.',
        );

        return false;
      }

      await sleep(retryIn);
    }
  }

  return false;
}

async function synchronizeAxiomsWithRetry(
  circuitBreaker: WatchdogCircuitBreaker,
): Promise<boolean> {
  try {
    console.log(
      `📂 [Watchdog] Synchronizing Axioms from model path: ${WATCHDOG_MODELS_PATH}`,
    );

    await integrityChecker.synchronizeAxioms(WATCHDOG_MODELS_PATH);

    console.log('✅ [Watchdog] Axiom synchronization completed.');
    return true;
  } catch (error: unknown) {
    const { message, code } = normalizeError(error);

    console.error(
      `❌ [Watchdog] Axiom synchronization failed ` +
        `(Code: ${code}): ${message}. Retrying...`,
    );

    await circuitBreaker.wait(WATCHDOG_SYNC_RETRY_DELAY_MS);
    return false;
  }
}

async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 [Watchdog] Prisma disconnected cleanly.');
  } catch (error: unknown) {
    const { message } = normalizeError(error);
    console.warn(`⚠️ [Watchdog] Prisma disconnect warning: ${message}`);
  }
}

async function run(): Promise<void> {
  console.log('🚀 Starting Sovereign Watchdog Integrity Check...');

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  const circuitBreaker = new WatchdogCircuitBreaker({
    failureThreshold: WATCHDOG_RETRY_THRESHOLD,
    successThreshold: 2,
    recoveryDelayMs: WATCHDOG_RECOVERY_DELAY_MS,
  });

  try {
    const dbReady = await waitForDatabase(
      prisma,
      WATCHDOG_INITIAL_DB_ATTEMPTS,
    );

    if (!dbReady) {
      console.error(
        '⚠️ [Watchdog] Initial database check failed. ' +
          'Entering recovery loop instead of crashing.',
      );
    }

    let integrityPassed = false;

    while (!integrityPassed && !isShuttingDown) {
      const healthOk = await circuitBreaker.executeHealthCheck(prisma);

      if (healthOk) {
        integrityPassed = await synchronizeAxiomsWithRetry(circuitBreaker);
        continue;
      }

      console.warn(
        `🔄 [Watchdog] Health check failed. Current circuit state: ${circuitBreaker.currentState}.`,
      );

      if (circuitBreaker.isDegraded) {
        console.log(
          '🔄 [Watchdog] Database unreachable. Waiting for reconnection...',
        );

        const reconnected = await waitForDatabase(prisma, 0);

        if (reconnected) {
          console.log(
            '✅ [Watchdog] Connection re-established. Resuming integrity logic...',
          );
        }

        continue;
      }

      await circuitBreaker.wait();
    }

    if (isShuttingDown) {
      console.warn('🛑 [Watchdog] Shutdown requested before completion.');
      await disconnectPrisma(prisma);
      return;
    }

    console.log(
      '✅ [Watchdog] All integrity checks passed. Service bootstrapping completed.',
    );

    await disconnectPrisma(prisma);
  } catch (error: unknown) {
    const { message, code } = normalizeError(error);

    console.error(
      `💀 [Watchdog] Unrecoverable failure in execution logic ` +
        `(Code: ${code}): ${message}`,
    );

    await disconnectPrisma(prisma);

    process.exitCode = 1;
  }
}

function requestShutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    console.warn(`⚠️ [Watchdog] Forced shutdown requested via ${signal}.`);
    process.exit(1);
  }

  isShuttingDown = true;

  console.warn(`🛑 [Watchdog] Received ${signal}. Graceful shutdown requested.`);
}

process.on('SIGINT', requestShutdown);
process.on('SIGTERM', requestShutdown);

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Watchdog] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💀 [Watchdog] Uncaught Exception:', error);

  // Bei uncaughtException lieber sterben lassen.
  // Docker/Kubernetes/PM2 soll sauber neu starten.
  process.exit(1);
});

void run();
