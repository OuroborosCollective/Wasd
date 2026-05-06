import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * 
 * Resilience Pattern: Exponential Backoff & Circuit-Breaker-Logik (Bootstrap Phase)
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

class DatabaseStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseStateError';
  }
}

/**
 * Circuit Breaker State for Bootstrap
 */
enum CircuitState {
  CLOSED,   // Normal operation
  OPEN,     // Failure detected, stop attempts
  HALF_OPEN // Testing if service is back
}

let bootstrapCircuit = {
  state: CircuitState.CLOSED,
  failureCount: 0,
  lastError: null as string | null,
};

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

    // 2. Mock Logic for Connectivity/Auth Errors (Representing actual DB Driver behavior)
    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials for database access. Check secrets.'));
    }

    if (process.env.SIMULATE_DB_ERROR === 'true' || bootstrapCircuit.state === CircuitState.OPEN) {
      return setTimeout(() => reject(new DatabaseStateError('ECONNREFUSED: Database host unreachable or circuit open')), 500);
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
    // Simulated async discovery
    setTimeout(() => {
      console.log(`[SENTINEL] [REDIS_READY] Connection established. Strategy: ${REDIS_CONFIG.retryStrategy.toString()}`);
      resolve();
    }, 200);
  });
}

/**
 * Resilience Implementation: Exponential Backoff Retry with Circuit-Breaker Logic
 * Prevents CI/CD pipeline crashes on transient network issues and handles stateful failures.
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      
      // Success: Reset Circuit
      bootstrapCircuit.state = CircuitState.CLOSED;
      bootstrapCircuit.failureCount = 0;
      bootstrapCircuit.lastError = null;

      console.log('[SENTINEL] [DATABASE_READY] Connection verified and stable.');
      return;
    } catch (error: unknown) {
      currentRetry++;
      bootstrapCircuit.failureCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      bootstrapCircuit.lastError = errorMessage;
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_TYPE]: ${errorName} | [DETAILS]: ${errorMessage}`);

      // Terminal failures (Configuration/Auth) should not be retried
      if (error instanceof AuthenticationError) {
        bootstrapCircuit.state = CircuitState.OPEN;
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal. Terminating bootstrap.');
        throw error;
      }

      if (currentRetry >= MAX_RETRIES) {
        bootstrapCircuit.state = CircuitState.OPEN;
        console.error('[SENTINEL] [CRITICAL_FAILURE] Max retries exhausted. Circuit OPEN.');
        throw new Error(`Failed to connect after ${MAX_RETRIES} attempts. Final state: ${errorMessage}`);
      }

      // Exponential backoff with jitter to prevent thundering herd
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
 * Ensures all uncaught errors are logged for CI/CD diagnostics before exit.
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
 * Health Check Endpoint for Kubernetes/Docker orchestrators
 */
app.get('/api/health', (req: Request, res: Response) => {
  const isHealthy = bootstrapCircuit.state !== CircuitState.OPEN;
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'areloria-api',
    circuit_breaker: CircuitState[bootstrapCircuit.state],
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * MAIN BOOTSTRAP SEQUENCE
 * Orchestrates the full service lifecycle with resilience.
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`PORT: ${PORT} | MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ARCH: ${process.arch} | PLATFORM: ${process.platform}`);
  console.log('--------------------------------------------------');

  try {
    // 1. Resilient DB Setup with Circuit Breaker Logic
    await initializeWithRetry();

    // 2. Redis Integration
    await connectToRedis();
    
    // 3. Listener Initialization
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
      
      // Force exit after 10s if connections hang
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
      console.error(`TYPE: ${error.name}`);
      console.error(`MSG: ${error.message}`);
      console.error(`STACK: ${error.stack}`);
    } else {
      console.error(`UNKNOWN_ERROR: ${String(error)}`);
    }
    console.error('##################################################');
    
    // Controlled exit for CI/CD failure detection
    process.exit(1);
  }
}

// Start the core engine
bootstrap();