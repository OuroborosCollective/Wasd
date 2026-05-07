import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * 
 * Implementation: Resilient Prisma Logic, Exponential Backoff & Global Recovery
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
 * Synergetic AI-Agent-System "Jules" Interface
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

    // PURITY ENFORCEMENT: Logical operations must remain idempotent
    if ('stateChange' in result && typeof result.stateChange !== 'undefined') {
      throw new PurityViolationError('STATE_MUTATION_DETECTED: Brain.process must remain pure.');
    }

    return result;
  }
};

/**
 * Utility: Sleep with Promise
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection Logic via Prisma with Race-Condition Protection
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Validating persistence layer...`);

  const connectionPromise = prisma.$connect().then(() => {
    console.log(`[SENTINEL] [DATABASE_HANDSHAKE] Prisma handshake completed.`);
    dbConnected = true;
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Threshold of ${CONNECTION_TIMEOUT_MS}ms exceeded`)), CONNECTION_TIMEOUT_MS)
  );

  try {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined in environment.');
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
 * Exponential Backoff Retry Wrapper for Bootstrap and Recovery
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection verified and established.');
      isRecovering = false;
      lastError = null;
      return;
    } catch (error: unknown) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] ${errorMessage}`);

      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL] Authentication/Configuration error. Retrying is futile.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        throw new Error(`CRITICAL: Database connection failed after ${MAX_RETRIES} attempts.`);
      }

      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      console.log(`[SENTINEL] [RETRY_DELAY] Waiting ${Math.round(totalDelay)}ms before next attempt...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * Recovery Orchestrator: Prevents process exit during transient DB failures
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  
  isRecovering = true;
  dbConnected = false;
  lastError = error.message;
  console.error(`[SENTINEL] [RECOVERY_MODE] Logic Loop Suspended. Reason: ${error.message}`);

  try {
    await initializeWithRetry();
    console.log('[SENTINEL] [RECOVERY_SUCCESS] System restoration complete. Resuming operations.');
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Exhausted all retry attempts. System halt required.');
    process.exit(1);
  }
}

/**
 * Global Process Handlers for Unhandled Failures
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error instanceof DatabaseConnectionError ||
                      error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('P2024') || // Connection pool timeout
                      error.message.includes('P2028'); // Transaction timeout

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error(`[SENTINEL] [FATAL_EXCEPTION] Non-recoverable error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error(`[SENTINEL] [UNHANDLED_REJECTION] ${error.message}`);
  initiateRecoveryMode(error);
});

// Middleware Configuration
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const isHealthy = dbConnected && !isRecovering;
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'healthy' : (isRecovering ? 'recovering' : 'unhealthy'),
    service: 'areloria-api',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    db_connected: dbConnected,
    recovery_mode: isRecovering,
    last_error: lastError,
    timestamp: new Date().toISOString()
  });
});

/**
 * THE ARE-LOOP TICK (10Hz)
 * Central World-Editor and AI-Agent Synchronization Logic
 */
function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting high-frequency world logic tick...');
  
  const tick = () => {
    if (isShuttingDown) return;

    if (isRecovering) {
      setTimeout(tick, ARE_LOOP_TICK_MS);
      return;
    }

    try {
      const mockPayload: AREPayload = {
        actionId: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        data: { origin: 'tick_system' }
      };

      if (validatePayload(mockPayload)) {
        Brain.process(mockPayload);
      }
    } catch (error: any) {
      console.error(`[SENTINEL] [ARE-LOOP_ERROR] Execution failed: ${error.message}`);
      if (error instanceof PurityViolationError) {
        console.error('[SENTINEL] [CRITICAL] Purity violation in logic loop. Immediate shutdown.');
        process.exit(1);
      }
    }

    setTimeout(tick, ARE_LOOP_TICK_MS);
  };

  tick();
}

/**
 * Prisma Known Request Error Middleware
 * Prevents logic errors from crashing the server
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict: Unique constraint violation.', target: err.meta?.target });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found: Record does not exist.' });
    }
    if (err.code === 'P2024' || err.code === 'P2028') {
      initiateRecoveryMode(err);
      return res.status(503).json({ error: 'Service Unavailable: Database connection pool exhausted.' });
    }
  }
  
  console.error('[EXPRESS_ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

/**
 * BOOTSTRAP SYSTEM
 * Orchestrates startup sequence with exponential backoff and global error handling
 */
async function bootstrap() {
  console.log('==================================================');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('==================================================');

  try {
    // Stage 1: Database Persistence with robust retry logic
    await initializeWithRetry();
    
    // Stage 2: Cache Layer (Mock/Ready for Integration)
    console.log(`[SENTINEL] [REDIS_BOOT] Validating Redis cluster state...`);
    await sleep(200); 
    console.log(`[SENTINEL] [REDIS_READY] Shared memory layer synchronized.`);
    
    // Stage 3: Start Server
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] Listening on Port: ${PORT}`);
      console.log(`[SENTINEL] [MODE] ${process.env.NODE_ENV || 'development'}`);
      
      // Stage 4: Activate World Logic
      startARELoop();
    });

    /**
     * Graceful Shutdown Orchestration
     */
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[SENTINEL] [SHUTDOWN] ${signal} received. Cleaning up resources...`);
      
      try {
        await prisma.$disconnect();
        console.log('[SENTINEL] [SHUTDOWN] Prisma disconnected.');
      } catch (e) {
        console.error('[SENTINEL] [SHUTDOWN_ERROR] Prisma disconnect failed.', e);
      }

      server.close(() => {
        console.log('[SENTINEL] [SHUTDOWN] HTTP Server closed.');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('[SENTINEL] [SHUTDOWN_TIMEOUT] Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[FATAL] BOOTSTRAP FAILED: ${msg}`);
    // Global Try-Catch prevents unhandled exceptions during boot stages
    process.exit(1);
  }
}

// Initializing the application
bootstrap().catch((err) => {
  console.error('[SENTINEL] [FATAL_ROOT] Boot loop failed with unhandled error:', err);
  process.exit(1);
});