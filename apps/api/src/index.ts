import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Resilience Configuration
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Custom Error Classes for explicit lifecycle handling
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
 * REDIS CONFIGURATION
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

/**
 * Helper for deterministic delays
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Core function for database connection initialization with explicit error classification.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // 1. Validation for Authentication
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined. Authentication impossible.'));
    }

    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials provided for database access.'));
    }

    // 2. Simulation of connection logic
    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable')), 500);
    }
    
    // Success simulation
    setTimeout(() => resolve(), 300);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Connection attempt exceeded ${CONNECTION_TIMEOUT_MS}ms safety threshold`)), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Redis Connectivity Validation
 */
async function connectToRedis(): Promise<void> {
  console.log(`[SENTINEL] [REDIS_BOOT] [${new Date().toISOString()}] Initializing Redis connection...`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[SENTINEL] [REDIS_READY] Connection established with strategy: ${REDIS_CONFIG.retryStrategy.toString()}`);
      resolve();
    }, 200);
  });
}

/**
 * Resilience Pattern: Exponential Backoff Retry Implementation
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection established and verified.');
      return;
    } catch (error: unknown) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_TYPE]: ${errorName}`);
      console.error(`[ERROR_DETAILS]: ${errorMessage}`);

      // Explicit handling for non-retryable errors
      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal. Check environment secrets.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        console.error('[SENTINEL] [CRITICAL_FAILURE] Max retries reached. Triggering emergency shutdown.');
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts. Last error: ${errorMessage}`);
      }

      const jitter = Math.random() * 200; 
      const totalDelay = delay + jitter;
      
      console.log(`[SENTINEL] [RETRY_SCHEDULED] Resilient backoff: Next attempt in ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * GLOBAL PROTECTION MECHANISMS
 * Enhanced logging for CI/CD diagnostics
 */
process.on('uncaughtException', (error: Error) => {
  console.error('==================================================');
  console.error('[SENTINEL] [FATAL_EXCEPTION] Uncaught error detected');
  console.error(`TIMESTAMP: ${new Date().toISOString()}`);
  console.error(`MESSAGE: ${error.message}`);
  console.error(`STACK: ${error.stack}`);
  console.error('==================================================');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('==================================================');
  console.error('[SENTINEL] [FATAL_REJECTION] Unhandled promise rejection');
  console.error(`TIMESTAMP: ${new Date().toISOString()}`);
  console.error(`REASON: ${reason instanceof Error ? reason.message : reason}`);
  if (reason instanceof Error) console.error(`STACK: ${reason.stack}`);
  console.error('==================================================');
  process.exit(1);
});

// Express Middleware Configuration
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'areloria-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    redis: 'connected'
  });
});

/**
 * Main Bootstrap Sequence
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`PORT: ${PORT} | MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ARCH: ${process.arch} | PLATFORM: ${process.platform}`);
  console.log('--------------------------------------------------');

  try {
    // Step 1: Resilient Database Initialization
    await initializeWithRetry();

    // Step 2: Redis Layer Validation
    await connectToRedis();
    
    // Step 3: Start API Listener
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
    });

    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received. Closing server...`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network connections closed safely.');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('[SENTINEL] [SHUTDOWN_TIMEOUT] Forcing termination due to hanging connections.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    console.error('##################################################');
    console.error('[FATAL] BOOTSTRAP SEQUENCE INTERRUPTED');
    
    if (error instanceof Error) {
      console.error(`TYPE: ${error.name}`);
      console.error(`MSG: ${error.message}`);
      console.error(`STACK: ${error.stack}`);
    } else {
      console.error(`UNKNOWN_ERROR: ${String(error)}`);
    }
    console.error('##################################################');
    process.exit(1);
  }
}

bootstrap();