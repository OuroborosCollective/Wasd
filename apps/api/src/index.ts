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
const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 15000;
const ARE_LOOP_TICK_MS = 100;

// Global State
let isRecovering = false;
let lastError: string | null = null;
let isShuttingDown = false;
let dbConnected = false;

/**
 * Custom Error Classes for Domain-Specific Handling
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

    if ('stateChange' in result && typeof result.stateChange !== 'undefined') {
      throw new PurityViolationError('STATE_MUTATION_DETECTED: Brain.process must remain pure.');
    }

    return result;
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection Logic via Prisma with Race-Condition Protection
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Validating persistence layer...`);

  const connectionPromise = prisma.$connect().then(() => {
    dbConnected = true;
    isRecovering = false;
    lastError = null;
    console.log(`[SENTINEL] [DATABASE_HANDSHAKE] Prisma handshake completed.`);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Threshold of ${CONNECTION_TIMEOUT_MS}ms exceeded`)), CONNECTION_TIMEOUT_MS)
  );

  try {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined.');
    }
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error: any) {
    dbConnected = false;
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new DatabaseConnectionError(`PRISMA_INIT_ERROR: ${error.message} (Code: ${error.errorCode})`);
    }
    throw error;
  }
}

/**
 * Exponential Backoff Retry Wrapper for Bootstrap and Recovery
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES && !isShuttingDown) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection verified.');
      return;
    } catch (error: any) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] ${errorMessage}`);

      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL] Authentication/Configuration error. Retrying halted.');
        isRecovering = false;
        return; 
      }

      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      console.log(`[SENTINEL] [RETRY_DELAY] Waiting ${Math.round(totalDelay)}ms before next attempt...`);
      await sleep(totalDelay);
      delay *= 2; 

      if (currentRetry >= MAX_RETRIES) {
        console.error(`[SENTINEL] [GRACEFUL_DEGRADATION] Operating in limited mode.`);
        isRecovering = true;
      }
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
  console.error(`[SENTINEL] [RECOVERY_MODE] Triggered by: ${error.message}`);

  try {
    await initializeWithRetry();
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Unexpected error in orchestrator.');
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
                      error.message.includes('P1001') ||
                      error.message.includes('P2024');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error(`[SENTINEL] [FATAL_EXCEPTION] ${error.message}`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error(`[SENTINEL] [UNHANDLED_REJECTION] ${error.message}`);
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
    uptime: Math.floor(process.uptime()),
    db_connected: dbConnected,
    recovery_mode: isRecovering,
    last_error: lastError,
    timestamp: new Date().toISOString()
  });
});

/**
 * THE ARE-LOOP TICK (10Hz)
 */
function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting logic tick...');
  
  const tick = () => {
    if (isShuttingDown) return;

    if (!isRecovering && dbConnected) {
      try {
        const mockPayload: AREPayload = {
          actionId: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          data: { origin: 'tick_system' }
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
    }

    setTimeout(tick, ARE_LOOP_TICK_MS);
  };

  tick();
}

/**
 * Prisma Error Middleware
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P1001', 'P1008', 'P2024', 'P2028'].includes(err.code)) {
      initiateRecoveryMode(err);
      return res.status(503).json({ error: 'Service Unavailable', code: err.code });
    }
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

/**
 * BOOTSTRAP
 */
async function bootstrap() {
  console.log('==================================================');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('==================================================');

  const server: Server = app.listen(PORT, () => {
    console.log(`[SENTINEL] [SERVER_START] Port: ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
    
    initializeWithRetry().catch(err => {
        console.error('[SENTINEL] [BOOT_DB_FAIL] DB init background failure:', err);
    });

    startARELoop();
  });

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SENTINEL] [SHUTDOWN] ${signal} received.`);
    
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('[SENTINEL] [SHUTDOWN_ERROR] Prisma disconnect fail.', e);
    }

    server.close(() => {
      console.log('[SENTINEL] [SHUTDOWN] HTTP Server closed.');
      process.exit(0);
    });
    
    setTimeout(() => { process.exit(1); }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[SENTINEL] [FATAL_ROOT] Boot failed:', err);
  process.exit(1);
});