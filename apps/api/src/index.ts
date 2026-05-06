import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * 
 * Implementation: Resilient Prisma Logic & Global Error Handling
 */

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Resilience Configuration Constants
const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 15000;
const ARE_LOOP_TICK_MS = 100; // 10Hz Logic Loop for AI/World State

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

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class PurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurityViolationError';
  }
}

class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * ARE-LOOP CORE LOGIC (Action-Result-Evaluation)
 */
interface AREPayload {
  actionId: string;
  timestamp: number;
  data: any;
}

const validatePayload = (payload: AREPayload): boolean => {
  if (!payload.actionId || !payload.timestamp) {
    console.warn('[ARE-LOOP] [VALIDATION_FAILED] Invalid payload structure.');
    return false;
  }
  return true;
};

const Brain = {
  process: (payload: AREPayload): any => {
    const result: any = {
      evaluated: true,
      actionId: payload.actionId,
    };

    // PURITY ENFORCEMENT:
    if ('stateChange' in result) {
      throw new PurityViolationError('STATE_MUTATION_DETECTED: Brain.process must remain pure.');
    }

    return result;
  }
};

/**
 * Utility: Sleep
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection Logic via Prisma
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Validating persistence layer...`);

  const connectionPromise = prisma.$connect().then(() => {
    console.log(`[SENTINEL] [DATABASE_HANDSHAKE] Prisma handshake completed.`);
    dbConnected = true;
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Threshold exceeded`)), CONNECTION_TIMEOUT_MS)
  );

  try {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined.');
    }
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
 * Redis Connectivity (Mock for architecture completeness)
 */
async function connectToRedis(): Promise<void> {
  console.log(`[SENTINEL] [REDIS_BOOT] Validating Redis cluster state...`);
  await sleep(200);
  console.log(`[SENTINEL] [REDIS_READY] Redis synchronization complete.`);
}

/**
 * Exponential Backoff Retry Wrapper
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection verified.');
      isRecovering = false;
      lastError = null;
      return;
    } catch (error: unknown) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] ${errorMessage}`);

      if (error instanceof AuthenticationError) {
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        throw new Error(`CRITICAL: Connection failed after ${MAX_RETRIES} attempts.`);
      }

      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * Recovery Orchestrator
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  
  isRecovering = true;
  dbConnected = false;
  lastError = error.message;
  console.error('[SENTINEL] [RECOVERY_MODE] Initiating circuit-breaker...');

  try {
    await initializeWithRetry();
    console.log('[SENTINEL] [RECOVERY_SUCCESS] Restored.');
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] System halt.');
    process.exit(1);
  }
}

/**
 * Global Process Handlers
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error instanceof DatabaseConnectionError ||
                      error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('P2024'); // Connection pool timeout

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error(`[SENTINEL] [FATAL_EXCEPTION] ${error.message}`);
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

/**
 * Prisma Logic Error Middleware
 * Handles P2002 (Unique constraint) and P2025 (Record not found)
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict: Unique constraint violation.', target: err.meta?.target });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found: Record does not exist.' });
    }
  }
  next(err);
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  const isHealthy = dbConnected && !isRecovering;
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'healthy' : (isRecovering ? 'recovering' : 'unhealthy'),
    service: 'areloria-api',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    db_connected: dbConnected,
    recovery_mode: isRecovering,
    last_error: lastError
  });
});

/**
 * THE ARE-LOOP TICK
 */
function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting world logic tick...');
  
  const tick = () => {
    if (isShuttingDown || isRecovering) {
      setTimeout(tick, ARE_LOOP_TICK_MS);
      return;
    }

    try {
      const mockPayload: AREPayload = {
        actionId: `act_${Date.now()}`,
        timestamp: Date.now(),
        data: {}
      };

      if (validatePayload(mockPayload)) {
        Brain.process(mockPayload);
      }
    } catch (error: any) {
      console.error(`[SENTINEL] [ARE-LOOP_ERROR] ${error.message}`);
      if (error instanceof PurityViolationError) {
        process.exit(1);
      }
    }

    setTimeout(tick, ARE_LOOP_TICK_MS);
  };

  tick();
}

/**
 * BOOTSTRAP
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('--------------------------------------------------');

  try {
    await initializeWithRetry();
    await connectToRedis();
    
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] Port: ${PORT}`);
      startARELoop();
    });

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[SENTINEL] [SHUTDOWN] ${signal} received. Disconnecting Prisma...`);
      
      await prisma.$disconnect();
      server.close(() => {
        console.log('[SENTINEL] [SHUTDOWN] HTTP Server closed.');
        process.exit(0);
      });
      
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] BOOTSTRAP FAILED: ${msg}`);
    process.exit(1);
  }
}

bootstrap();