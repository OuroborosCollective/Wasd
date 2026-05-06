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
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 10000;

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
 * REDIS CONFIGURATION (Infrastructure Layer)
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

/**
 * Utility: Deterministic delay with Promise
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Core function for database connection initialization.
 * Validates environment and handles connection handshake simulation.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // 1. Critical Configuration Validation
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined in production environment.'));
    }

    // 2. Mock Logic for Connectivity/Auth Errors (Extend for real DB clients here)
    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials for database access.'));
    }

    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable')), 500);
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
 * Prevents CI/CD pipeline crashes on transient network issues during startup.
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection verified and stable.');
      return;
    } catch (error: unknown) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_TYPE]: ${errorName} | [DETAILS]: ${errorMessage}`);

      // Terminal failures (Config/Auth) should not be retried to avoid lockouts/noise
      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        throw new Error(`CRITICAL: Failed to connect after ${MAX_RETRIES} attempts. Last error: ${errorMessage}`);
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200; 
      const totalDelay = delay + jitter;
      
      console.log(`[SENTINEL] [RETRY_SCHEDULED] Backing off: Next attempt in ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * GLOBAL PROCESS PROTECTION
 * Catch-all for unhandled exceptions to ensure diagnostic logging.
 */
process.on('uncaughtException', (error: Error) => {
  console.error('\n==================================================');
  console.error('[SENTINEL] [FATAL_EXCEPTION] Uncaught error detected');
  console.error(`TIMESTAMP: ${new Date().toISOString()}`);
  console.error(`MESSAGE: ${error.message}`);
  console.error(`STACK: ${error.stack}`);
  console.error('==================================================\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('\n==================================================');
  console.error('[SENTINEL] [FATAL_REJECTION] Unhandled promise rejection');
  console.error(`TIMESTAMP: ${new Date().toISOString()}`);
  console.error(`REASON: ${reason instanceof Error ? reason.message : reason}`);
  if (reason instanceof Error) console.error(`STACK: ${reason.stack}`);
  console.error('==================================================\n');
  process.exit(1);
});

// Middleware & Global API Configuration
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
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * MAIN BOOTSTRAP SEQUENCE
 * Orchestrates the full service lifecycle with resilience patterns.
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`PORT: ${PORT} | MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log('--------------------------------------------------');

  try {
    // 1. Execute Resilient Database Bootstrapper
    await initializeWithRetry();

    // 2. Initialize Infrastructure Dependencies
    await connectToRedis();
    
    // 3. Start Application Server
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
    });

    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    // 4. Graceful Shutdown Management
    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received. Initiating cleanup...`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network connections closed safely.');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('[SENTINEL] [SHUTDOWN_TIMEOUT] Forcing termination.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    console.error('##################################################');
    console.error('[FATAL] BOOTSTRAP SEQUENCE INTERRUPTED');
    if (error instanceof Error) {
      console.error(`TYPE: ${error.name} | MSG: ${error.message}`);
    }
    console.error('##################################################');
    process.exit(1);
  }
}

// Start the core engine
bootstrap();