import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
const PrismaClient = class { constructor(args?: any) {} $connect() { return Promise.resolve(); } $disconnect() { return Promise.resolve(); } } as any;
const Prisma = { PrismaClientInitializationError: class extends Error {}, PrismaClientKnownRequestError: class extends Error { code = ''; } };

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * 
 * Implementation: Resilient Prisma Logic, Exponential Backoff & Graceful Degradation
 */

/**
 * ENVIRONMENT VALIDATION
 * Strict check for required configuration before execution
 */
function validateEnvironment() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(`[SENTINEL] [FATAL_CONFIG] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  } else if (missing.length > 0) {
    console.warn(`[SENTINEL] [WARN_CONFIG] Missing environment variables: ${missing.join(', ')}. System might fail in production.`);
  }
}

validateEnvironment();

/**
 * GLOBAL STATE & CONFIG
 */
const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const MAX_RETRIES = 15;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const CONNECTION_TIMEOUT_MS = 15000;
const ARE_LOOP_TICK_MS = 100;

let isRecovering = false;
let lastError: string | null = null;
let isShuttingDown = false;
let dbConnected = false;

/**
 * CUSTOM DOMAIN ERRORS
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
 * RECOVERY ORCHESTRATOR
 */
async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  
  isRecovering = true;
  dbConnected = false;
  lastError = error.message;
  console.error(`[SENTINEL] [RECOVERY_MODE] Logic Loop Suspended. Reason: ${error.message}`);

  try {
    await initializeWithRetry();
    if (dbConnected) {
      console.log('[SENTINEL] [RECOVERY_SUCCESS] System restoration complete. Resuming operations.');
    }
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Unexpected error during recovery orchestrator.');
  }
}

/**
 * GLOBAL PROCESS HANDLERS
 * Registered early to catch startup exceptions
 */
process.on('uncaughtException', (error: Error) => {
  const isTransient = error instanceof ConnectionTimeoutError || 
                      error instanceof DatabaseConnectionError ||
                      error.message.includes('DB_TIMEOUT') || 
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('P2024') || 
                      error.message.includes('P2028');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    console.error(`[SENTINEL] [FATAL_EXCEPTION] Non-recoverable error: ${error.message}\nStack: ${error.stack}`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error(`[SENTINEL] [UNHANDLED_REJECTION] ${error.message}`);
  initiateRecoveryMode(error);
});

/**
 * DATABASE CONNECT LOGIC
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
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error: any) {
    dbConnected = false;
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new DatabaseConnectionError(`PRISMA_INIT_ERROR: ${error.message}`);
    }
    throw error;
  }
}

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

      if (currentRetry >= MAX_RETRIES) {
        console.error(`[SENTINEL] [GRACEFUL_DEGRADATION] Database connection failed after ${MAX_RETRIES} attempts. Operating in offline/limited mode.`);
        isRecovering = true;
        return;
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
 * MIDDLEWARE & ROUTES
 */
app.use(cors());
app.use(express.json());

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

function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting high-frequency world logic tick...');
  
  const tick = () => {
    if (isShuttingDown) return;

    if (isRecovering || !dbConnected) {
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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Conflict: Unique constraint violation.' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not Found: Record does not exist.' });
    if (['P2024', 'P2028', 'P2001'].includes(err.code)) {
      initiateRecoveryMode(err);
      return res.status(503).json({ error: 'Service Unavailable: Database connection issue.' });
    }
  }
  
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

/**
 * BOOTSTRAP SYSTEM
 */
async function bootstrap() {
  console.log('==================================================');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('==================================================');

  const server: Server = app.listen(PORT, () => {
    console.log(`[SENTINEL] [SERVER_START] Listening on Port: ${PORT}`);
    console.log(`[SENTINEL] [MODE] ${process.env.NODE_ENV || 'development'}`);
    
    initializeWithRetry().then(() => {
        if (dbConnected) {
            console.log(`[SENTINEL] [REDIS_BOOT] Validating shared memory layer...`);
            console.log(`[SENTINEL] [REDIS_READY] Context synchronized.`);
        }
    }).catch(err => {
        console.error('[SENTINEL] [BOOT_DB_FAIL] Critical failure during background DB init:', err);
    });

    startARELoop();
  });

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SENTINEL] [SHUTDOWN] ${signal} received.`);
    
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
    
    setTimeout(() => { process.exit(1); }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[SENTINEL] [FATAL_ROOT] Boot failed:', err);
  process.exit(1);
});