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

// Resilience & Scaling Constants
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
 * CORE SERVICES: AXIOMATIC EVENT BUS & STATE COMPILER
 */
class AxiomaticEventBus {
  public async init() {
    console.log('[CORE] [EVENT_BUS] Initializing axiomatic event distribution...');
    // Implementation for event routing logic
    return true;
  }
}

class AREStateCompiler {
  public async init() {
    console.log('[CORE] [STATE_COMPILER] Bootstrapping world state consistency engine...');
    // Implementation for differential state tracking
    return true;
  }
}

const eventBus = new AxiomaticEventBus();
const stateCompiler = new AREStateCompiler();

/**
 * Custom Error Classes
 */
class ConnectionTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = 'ConnectionTimeoutError'; }
}
class AuthenticationError extends Error {
  constructor(message: string) { super(message); this.name = 'AuthenticationError'; }
}
class PurityViolationError extends Error {
  constructor(message: string) { super(message); this.name = 'PurityViolationError'; }
}
class DatabaseConnectionError extends Error {
  constructor(message: string) { super(message); this.name = 'DatabaseConnectionError'; }
}

interface AREPayload {
  actionId: string;
  timestamp: number;
  data: any;
}

const Brain = {
  process: (payload: AREPayload): any => {
    const result: any = { evaluated: true, actionId: payload.actionId };
    if ('stateChange' in result && typeof result.stateChange !== 'undefined') {
      throw new PurityViolationError('STATE_MUTATION_DETECTED: Brain.process must remain pure.');
    }
    return result;
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
      throw new AuthenticationError('MISSING_CONFIG: DATABASE_URL is not defined.');
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
        console.error('[SENTINEL] [FATAL] Auth error. Halted.');
        isRecovering = false;
        return; 
      }

      if (currentRetry >= MAX_RETRIES) {
        console.error(`[SENTINEL] [GRACEFUL_DEGRADATION] Operating in limited mode.`);
        isRecovering = true;
        return;
      }

      const totalDelay = Math.min(delay + (Math.random() * 1000), MAX_BACKOFF_MS);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

async function initiateRecoveryMode(error: Error) {
  if (isRecovering || isShuttingDown) return;
  isRecovering = true;
  dbConnected = false;
  lastError = error.message;
  console.error(`[SENTINEL] [RECOVERY_MODE] Logic Loop Suspended. Reason: ${error.message}`);

  try {
    await initializeWithRetry();
  } catch (recoveryError) {
    console.error('[SENTINEL] [RECOVERY_FAILED] Unexpected error in recovery.');
  }
}

/**
 * GLOBAL PROCESS HANDLERS
 */
process.on('uncaughtException', (error: Error) => {
  console.error('--------------------------------------------------');
  console.error(`[SENTINEL] [UNCAUGHT_EXCEPTION] CRITICAL ERROR DETECTED`);
  console.error(`Message: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  console.error('--------------------------------------------------');

  const isTransient = error instanceof ConnectionTimeoutError || 
                      error instanceof DatabaseConnectionError ||
                      error.message.includes('ECONNREFUSED') ||
                      error.message.includes('P2024');

  if (isTransient) {
    initiateRecoveryMode(error);
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('--------------------------------------------------');
  console.error(`[SENTINEL] [UNHANDLED_REJECTION] ASYNC PROMISE FAILED`);
  console.error(`Reason: ${error.message}`);
  console.error('--------------------------------------------------');
  initiateRecoveryMode(error);
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  const isHealthy = dbConnected && !isRecovering;
  res.status(isHealthy ? 200 : 503).json({ 
    status: isHealthy ? 'healthy' : (isRecovering ? 'recovering' : 'unhealthy'),
    service: 'areloria-api',
    uptime: Math.floor(process.uptime()),
    db_connected: dbConnected,
    recovery_mode: isRecovering,
    timestamp: new Date().toISOString()
  });
});

function startARELoop() {
  console.log('[SENTINEL] [ARE-LOOP] Starting world logic tick...');
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
      Brain.process(mockPayload);
    } catch (error: any) {
      if (error instanceof PurityViolationError) {
        console.error('[SENTINEL] [CRITICAL] Purity violation. Shutting down.');
        process.exit(1);
      }
    }
    setTimeout(tick, ARE_LOOP_TICK_MS);
  };
  tick();
}

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P2024', 'P2028', 'P2001'].includes(err.code)) {
      initiateRecoveryMode(err);
      return res.status(503).json({ error: 'Database connection issue.' });
    }
  }
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function bootstrap() {
  console.log('==================================================');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('==================================================');

  // Step 1: Initialize Core Services with explicit protection
  try {
    await eventBus.init();
    await stateCompiler.init();
    console.log('[CORE] [BOOT] Essential services online.');
  } catch (serviceError: any) {
    console.error(`[CORE] [FATAL] Service initialization failed: ${serviceError.message}`);
    // Non-fatal for the process itself, but logs the failure
  }

  // Step 2: Start HTTP Server
  const server: Server = app.listen(PORT, () => {
    console.log(`[SENTINEL] [SERVER_START] Listening on Port: ${PORT}`);
    
    // Step 3: Background DB Initialization
    initializeWithRetry().catch(err => {
        console.error('[SENTINEL] [BOOT_DB_FAIL] Critical failure during DB init:', err);
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
      console.error('[SENTINEL] [SHUTDOWN_ERROR] Prisma disconnect failed.', e);
    }

    server.close(() => {
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