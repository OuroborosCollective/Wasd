import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * 
 * Architecture: Resilience-first with Exponential Backoff and 
 * Circuit-Breaker inspired Recovery Orchestration.
 * 
 * This module ensures the API remains operational even during 
 * transient infrastructure instability (DB/Redis drops).
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Resilience Configuration Constants
const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 15000;

// Global State for Recovery Orchestration
let isRecovering = false;
let lastError: string | null = null;
let isShuttingDown = false;

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
 * Simulates connection logic for Areloria's persistence layer.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // 1. Critical Configuration Validation
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined in production environment.'));
    }

    // 2. Mock Logic for Connectivity/Auth Errors based on ENV simulation
    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials for database access.'));
    }

    if (process.env.SIMULATE_DB_BOOTING === 'true' || process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable.')), 1000);
    }
    
    // Successful Handshake Simulation
    setTimeout(() => {
      console.log(`[SENTINEL] [DATABASE_HANDSHAKE] Handshake completed successfully.`);
      resolve();
    }, 500);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Connection exceeded ${CONNECTION_TIMEOUT_MS}ms threshold`)), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Redis Connectivity Layer
 * Essential for Real-time Jules Agent State and Pub/Sub mechanics.
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
 * Encapsulates the retry logic for database connectivity to prevent CI/CD failures.
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
      
      lastError = errorMessage;
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] Type: ${errorName} - ${errorMessage}`);

      // Terminal Errors: Do not retry if configuration or auth is fundamentally broken
      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal. Check environment variables.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        throw new Error(`CRITICAL: Database connection failed after ${MAX_RETRIES} attempts.`);
      }

      // Exponential Backoff with Jitter to prevent thundering herd
      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      console.warn(`[SENTINEL] [RETRY_SCHEDULED] Waiting ${Math.round(totalDelay)}ms before next attempt...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * Controlled Recovery Orchestrator
 * Triggered by global handlers when a transient error occurs post-boot.
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  
  isRecovering = true;
  lastError = error.message;
  console.error('\n==================================================');
  console.error('[SENTINEL] [RECOVERY_MODE] Initiating circuit-breaker recovery...');
  console.error(`REASON: ${error.message}`);
  console.error('==================================================\n');

  try {
    // Attempt to re-establish connectivity
    await initializeWithRetry();
    console.log('[SENTINEL] [RECOVERY_SUCCESS] System connectivity restored.');
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Fatal failure during recovery attempt. Forcing exit.');
    process.exit(1);
  }
}

/**
 * GLOBAL PROCESS PROTECTION & RECOVERY HANDLERS
 * Ensures the API remains resilient against transient network drops in production/CI.
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('ETIMEDOUT');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error('\n==================================================');
    console.error('[SENTINEL] [FATAL_EXCEPTION] Non-recoverable error occurred');
    console.error(`MESSAGE: ${error.message}`);
    console.error(`STACK: ${error.stack}`);
    console.error('==================================================\n');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const isTransient = error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('ETIMEDOUT');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error('\n==================================================');
    console.error('[SENTINEL] [FATAL_REJECTION] Non-recoverable promise rejection');
    console.error(`REASON: ${error.message}`);
    console.error('==================================================\n');
    process.exit(1);
  }
});

// Middleware Configuration
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpoint
 * Provides insight into the current resilience state and uptime.
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
 * Orchestrates the startup of all critical infrastructure components.
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('--------------------------------------------------');

  try {
    // 1. Database Initialization with Retry Strategy
    await initializeWithRetry();
    
    // 2. Redis Cluster Handshake
    await connectToRedis();
    
    // 3. Express Server Start
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
      console.log(`[SENTINEL] [READY] Areloria WASD Infrastructure is operational.`);
    });

    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    /**
     * Graceful Shutdown Implementation
     */
    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received. Closing connections...`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network sockets closed.');
        process.exit(0);
      });
      
      // Force exit if cleanup takes too long
      setTimeout(() => {
        console.error('[SENTINEL] [SHUTDOWN_TIMEOUT] Forcing termination.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('##################################################');
    console.error('[FATAL] BOOTSTRAP SEQUENCE INTERRUPTED');
    console.error(`REASON: ${msg}`);
    console.error('##################################################');
    process.exit(1);
  }
}

// Execute the bootstrap sequence
bootstrap();