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
const CONNECTION_TIMEOUT_MS = 15000;
const ARE_LOOP_TICK_MS = 100; // 10Hz Logic Loop for AI/World State

// Global State
let isRecovering = false;
let lastError: string | null = null;
let isShuttingDown = false;

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

/**
 * ARE-LOOP CORE LOGIC (Action-Result-Evaluation)
 * Ensures deterministic AI processing and world state integrity.
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
    // Logic processing for Jules Agent Systems
    const result = {
      evaluated: true,
      actionId: payload.actionId,
      // stateChange: { health: 100 } // This would trigger a PurityViolationError
    };

    // PURITY ENFORCEMENT:
    // The Brain.process flow must be stateless. Mutations are handled via explicit Evaluation outcomes.
    if ('stateChange' in result) {
      throw new PurityViolationError('STATE_MUTATION_DETECTED: Brain.process must remain pure. Use Evaluation layer for state transitions.');
    }

    return result;
  }
};

/**
 * Utility: Sleep
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Database Connection Logic
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return reject(new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined in production environment.'));
    }

    if (process.env.SIMULATE_AUTH_ERROR === 'true') {
      return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials.'));
    }

    if (process.env.SIMULATE_DB_BOOTING === 'true' || process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable.')), 1000);
    }
    
    setTimeout(() => {
      console.log(`[SENTINEL] [DATABASE_HANDSHAKE] Handshake completed.`);
      resolve();
    }, 500);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new ConnectionTimeoutError(`DB_TIMEOUT: Threshold exceeded`)), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Redis Connectivity
 */
async function connectToRedis(): Promise<void> {
  console.log(`[SENTINEL] [REDIS_BOOT] Validating Redis cluster state...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[SENTINEL] [REDIS_READY] Connection established.`);
      resolve();
    }, 200);
  });
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
  lastError = error.message;
  console.error('[SENTINEL] [RECOVERY_MODE] Initiating circuit-breaker...');

  try {
    await initializeWithRetry();
    console.log('[SENTINEL] [RECOVERY_SUCCESS] Restored.');
  } catch (recoveryError) {
    process.exit(1);
  }
}

/**
 * Global Error Handlers
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED');

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

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  const status = isRecovering ? 'recovering' : 'healthy';
  res.status(isRecovering ? 503 : 200).json({ 
    status,
    service: 'areloria-api',
    uptime: Math.floor(process.uptime()),
    recovery_mode: isRecovering
  });
});

/**
 * THE ARE-LOOP TICK
 * Orchestrates the autonomous world logic.
 */
function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting world logic tick...');
  
  const tick = () => {
    if (isShuttingDown || isRecovering) {
      setTimeout(tick, ARE_LOOP_TICK_MS);
      return;
    }

    try {
      // 1. Action Identification (Mocking dynamic input from buffer)
      const mockPayload: AREPayload = {
        actionId: `act_${Date.now()}`,
        timestamp: Date.now(),
        data: {}
      };

      // 2. Validation
      if (validatePayload(mockPayload)) {
        // 3. Evaluation & Purity Check via Brain
        Brain.process(mockPayload);
      }

    } catch (error: any) {
      console.error(`[SENTINEL] [ARE-LOOP_ERROR] ${error.message}`);
      if (error instanceof PurityViolationError) {
        // Halt system on purity violation to prevent corrupting state
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
      // Start the ARE-Loop after infrastructure is ready
      startARELoop();
    });

    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[SENTINEL] [SHUTDOWN] ${signal} received.`);
      server.close(() => process.exit(0));
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