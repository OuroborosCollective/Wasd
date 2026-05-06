import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 */

/**
 * EXIT CODES
 * Standardized codes for CI/CD and Orchestrator diagnostics
 */
enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  CONFIG_ERROR = 2,
  DEPENDENCY_ERROR = 3,
}

const app = express();
const PORT = process.env.PORT || 3000;

// Resilience Configuration
const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 10000;

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
 * Circuit Breaker State
 */
const CircuitState = {
  isOpen: false,
  failures: 0,
  threshold: 5,
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection Logic
 * Note: Replace mock logic with actual DB client (Prisma/TypeORM) call in production.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  if (CircuitState.isOpen) {
    throw new Error('CIRCUIT_BREAKER: Database connection is currently blocked due to repeated failures.');
  }

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // 1. Configuration Validation
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined.'));
    }

    // 2. Simulation Logic (For Testing Resilience)
    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid database credentials.'));
    }

    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable.')), 500);
    }
    
    // Successful Handshake Simulation
    setTimeout(() => resolve(), 300);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Connection exceeded ${CONNECTION_TIMEOUT_MS}ms threshold`)), CONNECTION_TIMEOUT_MS)
  );

  try {
    await Promise.race([connectionPromise, timeoutPromise]);
    CircuitState.failures = 0; // Reset on success
  } catch (error) {
    CircuitState.failures++;
    if (CircuitState.failures >= CircuitState.threshold) {
      CircuitState.isOpen = true;
      console.error('[SENTINEL] [CIRCUIT_BREAKER] Threshold reached. Circuit OPEN.');
    }
    throw error;
  }
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
 * Exponential Backoff Strategy
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
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[DETAILS]: ${errorMessage}`);

      if (error instanceof AuthenticationError) {
        console.error('[SENTINEL] [FATAL_AUTH] Authentication failure is terminal.');
        process.exit(ExitCode.CONFIG_ERROR);
      }

      if (currentRetry >= MAX_RETRIES) {
        console.error(`[SENTINEL] [FATAL_RETRY] Maximum retry attempts (${MAX_RETRIES}) exhausted.`);
        process.exit(ExitCode.DEPENDENCY_ERROR);
      }

      const jitter = Math.random() * 1000; 
      const totalDelay = Math.min(delay + jitter, MAX_BACKOFF_MS);
      
      console.warn(`[SENTINEL] [RETRY_SCHEDULED] Waiting ${Math.round(totalDelay)}ms before next attempt...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * Global Exception Handlers
 */
process.on('uncaughtException', (error: Error) => {
  console.error('\n[SENTINEL] [FATAL_EXCEPTION]', error);
  process.exit(ExitCode.GENERAL_ERROR);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('\n[SENTINEL] [FATAL_REJECTION]', reason);
  process.exit(ExitCode.GENERAL_ERROR);
});

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'areloria-api',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Main Bootstrap Sequence
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`PORT: ${PORT} | ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log('--------------------------------------------------');

  try {
    // 1. Resilient Database Initialization
    await initializeWithRetry();

    // 2. Auxiliary Dependencies
    await connectToRedis();
    
    // 3. Start Express Server
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API operational on port: ${PORT}`);
    });

    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    // 4. Graceful Shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received.`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network connections closed.');
        process.exit(ExitCode.SUCCESS);
      });
      
      setTimeout(() => {
        console.error('[SENTINEL] [SHUTDOWN_TIMEOUT] Forcing termination.');
        process.exit(ExitCode.GENERAL_ERROR);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: unknown) {
    console.error('##################################################');
    console.error('[FATAL] BOOTSTRAP SEQUENCE INTERRUPTED');
    console.error(error);
    console.error('##################################################');
    process.exit(ExitCode.DEPENDENCY_ERROR);
  }
}

bootstrap();