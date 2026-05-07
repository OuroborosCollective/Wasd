import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 */

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Resilience Configuration Constants
const MAX_BOOTSTRAP_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;
const CONNECTION_TIMEOUT_MS = 5000;
const ARE_LOOP_TICK_MS = 100;

// Global State
let isRecovering = false;
let lastError: string | null = null;
let isShuttingDown = false;
let dbConnected = false;

/**
 * Custom Error Classes
 */
class ConnectionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionTimeoutError';
  }
}

class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

class PurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurityViolationError';
  }
}

/**
 * ARE-LOOP CORE LOGIC
 */
interface AREPayload {
  actionId: string;
  timestamp: number;
  data: any;
}

const validatePayload = (payload: AREPayload): boolean => {
  return !!(payload.actionId && payload.timestamp);
};

const Brain = {
  process: (payload: AREPayload): any => {
    const result: any = { evaluated: true, actionId: payload.actionId };
    if ('stateChange' in result && typeof result.stateChange !== 'undefined') {
      throw new PurityViolationError('STATE_MUTATION_DETECTED');
    }
    return result;
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection with Timeout handling
 */
async function connectToDatabase(): Promise<void> {
  const connectionPromise = prisma.$connect().then(() => {
    dbConnected = true;
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: ${CONNECTION_TIMEOUT_MS}ms exceeded`)), CONNECTION_TIMEOUT_MS)
  );

  try {
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error: any) {
    dbConnected = false;
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new DatabaseConnectionError(`PRISMA_INIT_ERROR: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Implementation of Robust Retry Logic with Exponential Backoff
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_BOOTSTRAP_RETRIES) {
    try {
      console.log(`[SENTINEL] [DB_CONNECT] Attempt ${currentRetry + 1}/${MAX_BOOTSTRAP_RETRIES}...`);
      await connectToDatabase();
      console.log('[SENTINEL] [DB_READY] Database connection established.');
      isRecovering = false;
      lastError = null;
      return;
    } catch (error: any) {
      currentRetry++;
      lastError = error.message;
      
      if (currentRetry >= MAX_BOOTSTRAP_RETRIES) {
        console.error(`[SENTINEL] [FATAL] Database connection failed after ${MAX_BOOTSTRAP_RETRIES} attempts.`);
        throw new DatabaseConnectionError('CRITICAL_DATABASE_FAILURE: Max retries reached.');
      }

      const jitter = Math.random() * 500;
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      console.warn(`[SENTINEL] [DB_RETRY] Waiting ${Math.round(totalDelay)}ms before next attempt...`);
      await sleep(totalDelay);
      delay *= 2;
    }
  }
}

/**
 * Recovery Orchestrator for runtime failures
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  isRecovering = true;
  dbConnected = false;
  lastError = error.message;
  console.error(`[SENTINEL] [RECOVERY] Reason: ${error.message}`);

  try {
    await initializeWithRetry();
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] System could not be restored. Triggering shutdown.');
    process.exit(1);
  }
}

/**
 * Global Handlers
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error instanceof DatabaseConnectionError ||
                      error.message.includes('P2024') || 
                      error.message.includes('ECONNREFUSED');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error(`[SENTINEL] [FATAL] ${error.message}`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  initiateRecoveryMode(error);
});

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  const isHealthy = dbConnected && !isRecovering;
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'healthy' : (isRecovering ? 'recovering' : 'unhealthy'),
    db_connected: dbConnected,
    timestamp: new Date().toISOString()
  });
});

/**
 * ARE-LOOP Execution
 */
function startARELoop() {
  const tick = () => {
    if (isShuttingDown) return;
    if (!isRecovering && dbConnected) {
      try {
        const payload: AREPayload = {
          actionId: `act_${Date.now()}`,
          timestamp: Date.now(),
          data: { system: 'tick' }
        };
        if (validatePayload(payload)) Brain.process(payload);
      } catch (error: any) {
        if (error instanceof PurityViolationError) process.exit(1);
      }
    }
    setTimeout(tick, ARE_LOOP_TICK_MS);
  };
  tick();
}

/**
 * Prisma Error Handling Middleware
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P2024', 'P2028', 'P2001'].includes(err.code)) {
      initiateRecoveryMode(err);
      return res.status(503).json({ error: 'Database connection issue' });
    }
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

/**
 * MAIN BOOTSTRAP
 */
async function bootstrap() {
  console.log('=== ARELORIA WASD API BOOTSTRAP ===');

  try {
    // 1. Core Database Initialization (MUST succeed or retry)
    await initializeWithRetry();

    // 2. Start HTTP Interface
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [BOOT] Listening on Port ${PORT}`);
      
      // 3. Start World Logic
      startARELoop();
    });

    /**
     * Graceful Shutdown
     */
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[SENTINEL] [SHUTDOWN] Signal: ${signal}`);
      
      try {
        await prisma.$disconnect();
        server.close(() => {
          console.log('[SENTINEL] [SHUTDOWN] Clean exit completed.');
          process.exit(0);
        });
      } catch (e) {
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[SENTINEL] [BOOT_FAILED] Fatal error during startup:', err);
    process.exit(1);
  }
}

bootstrap();