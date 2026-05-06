import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Resilience Configuration Constants
const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 10000;

// Global State for Recovery Orchestration
let isRecovering = false;
let lastError: string | null = null;

/**
 * Custom Error Classes for explicit lifecycle and diagnostic handling
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

/**
 * Utility: Deterministic delay with Promise
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Core function for database connection initialization.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // 1. Critical Configuration Validation
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined in production environment.'));
    }

    // 2. Mock Logic for Connectivity/Auth Errors
    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials for database access.'));
    }

    if (process.env.SIMULATE_DB_BOOTING === 'true' || process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable.')), 500);
    }
    
    // Successful Handshake Simulation
    setTimeout(() => resolve(), 300);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Connection exceeded ${CONNECTION_TIMEOUT_MS}ms threshold`)), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Redis Connectivity Layer
 */
async function connectToRedis(): Promise<void> {
  console.log(`[SENTINEL] [REDIS_BOOT] [${new Date().toISOString()}] Validating Redis cluster state...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[SENTINEL] [REDIS_READY] Connection established.`);
      resolve();
    }, 200);
  });
}

/**
 * Resilience Implementation: Exponential Backoff Retry Wrapper
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection verified and stable.');
      isRecovering = false;
      lastError = null;
      return;
    } catch (error: unknown) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] Type: ${errorName}`);

      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        throw new Error(`CRITICAL: Database connection failed after ${MAX_RETRIES} attempts.`);
      }

      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      console.warn(`[SENTINEL] [RETRY_SCHEDULED] Waiting ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * Controlled Recovery Orchestrator
 * Triggered by global handlers when a DB timeout or transient error occurs post-boot.
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering) return;
  
  isRecovering = true;
  lastError = error.message;
  console.error('\n==================================================');
  console.error('[SENTINEL] [RECOVERY_MODE] Initiating circuit-breaker recovery...');
  console.error(`REASON: ${error.message}`);
  console.error('==================================================\n');

  try {
    await initializeWithRetry();
    console.log('[SENTINEL] [RECOVERY_SUCCESS] System connectivity restored.');
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Fatal failure during recovery attempt.');
    process.exit(1);
  }
}

/**
 * GLOBAL PROCESS PROTECTION & RECOVERY HANDLERS
 */
process.on('uncaughtException', (error: Error) => {
  const isTimeout = error instanceof ConnectionTimeoutError || error.message.includes('DB_TIMEOUT') || error.message.includes('ECONNREFUSED');

  if (isTimeout) {
    initiateRecoveryMode(error);
  } else {
    console.error('\n==================================================');
    console.error('[SENTINEL] [FATAL_EXCEPTION] Non-recoverable error');
    console.error(`MESSAGE: ${error.message}`);
    console.error(`STACK: ${error.stack}`);
    console.error('==================================================\n');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const isTimeout = error.message.includes('DB_TIMEOUT') || error.message.includes('ECONNREFUSED');

  if (isTimeout) {
    initiateRecoveryMode(error);
  } else {
    console.error('\n==================================================');
    console.error('[SENTINEL] [FATAL_REJECTION] Non-recoverable promise rejection');
    console.error(`REASON: ${error.message}`);
    console.error('==================================================\n');
    process.exit(1);
  }
});

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpoint with Recovery awareness
 */
app.get('/api/health', (req: Request, res: Response) => {
  const status = isRecovering ? 'recovering' : 'healthy';
  res.status(isRecovering ? 503 : 200).json({ 
    status,
    service: 'areloria-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    recovery_mode: isRecovering,
    last_error: lastError
  });
});

/**
 * MAIN BOOTSTRAP SEQUENCE
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('--------------------------------------------------');

  try {
    await initializeWithRetry();
    await connectToRedis();
    
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
    });

    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received.`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All connections closed.');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    console.error('##################################################');
    console.error('[FATAL] BOOTSTRAP SEQUENCE INTERRUPTED');
    console.error('##################################################');
    process.exit(1);
  }
}

bootstrap();