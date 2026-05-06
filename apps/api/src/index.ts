import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { EventEmitter } from 'events';

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

// Global State
let isRecovering = false;
let isShuttingDown = false;
let lastError: string | null = null;
let dbConnected = false;

/**
 * Mock Database Client to simulate Prisma/Mongoose event-driven behavior
 * In a production environment, this would be your actual DB client (e.g., prisma.$on or mongoose.connection)
 */
class DatabaseClient extends EventEmitter {
  async connect(): Promise<void> {
    // Simulated connection logic
    return new Promise((resolve, reject) => {
      if (process.env.SIMULATE_AUTH_ERROR === 'true') {
        return reject(new AuthenticationError('AUTH_FAILURE: Invalid credentials.'));
      }
      
      const timeout = setTimeout(() => {
        reject(new ConnectionTimeoutError('DB_TIMEOUT: Handshake exceeded threshold.'));
      }, CONNECTION_TIMEOUT_MS);

      setTimeout(() => {
        clearTimeout(timeout);
        if (process.env.SIMULATE_DB_ERROR === 'true') {
          reject(new Error('ECONNREFUSED: Database host unreachable.'));
        } else {
          dbConnected = true;
          this.emit('connected');
          resolve();
        }
      }, 500);
    });
  }

  async disconnect(): Promise<void> {
    dbConnected = false;
    this.emit('disconnected');
  }
}

const db = new DatabaseClient();

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

/**
 * Utility: Deterministic delay with jitter
 */
const sleep = (ms: number): Promise<void> => {
  const jitter = Math.random() * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
};

/**
 * Robust Database Connection Manager with Exponential Backoff
 */
async function connectWithRetry(attempt: number = 1): Promise<void> {
  try {
    console.log(`[SENTINEL] [DB_CONNECT] Attempt ${attempt}/${MAX_RETRIES}...`);
    await db.connect();
    console.log('[SENTINEL] [DATABASE_READY] Connection established and verified.');
    isRecovering = false;
    lastError = null;
  } catch (error: any) {
    lastError = error.message;
    
    // Terminal Errors: Do not retry
    if (error instanceof AuthenticationError || (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL)) {
      console.error(`[SENTINEL] [FATAL_CONFIG] ${error.message}`);
      throw error; 
    }

    if (attempt >= MAX_RETRIES) {
      console.error(`[SENTINEL] [MAX_RETRIES_REACHED] Failed after ${MAX_RETRIES} attempts.`);
      throw new Error('Database connection failed permanently.');
    }

    const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
    console.warn(`[SENTINEL] [RETRY_WARNING] Connection failed: ${error.message}. Retrying in ${delay}ms...`);
    
    await sleep(delay);
    return connectWithRetry(attempt + 1);
  }
}

/**
 * Event Listeners for Database State
 */
db.on('disconnected', () => {
  console.error('[SENTINEL] [DB_EVENT] Database connection lost.');
  dbConnected = false;
  if (!isShuttingDown) {
    initiateRecovery();
  }
});

db.on('error', (err) => {
  console.error('[SENTINEL] [DB_EVENT] Database error occurred:', err);
  if (!isShuttingDown) {
    initiateRecovery();
  }
});

/**
 * Recovery Orchestrator
 */
async function initiateRecovery() {
  if (isRecovering) return;
  isRecovering = true;
  console.log('[SENTINEL] [RECOVERY] Starting circuit-breaker recovery sequence...');
  
  try {
    await connectWithRetry();
  } catch (error) {
    console.error('[SENTINEL] [RECOVERY_FAILED] System could not recover. Triggering shutdown.');
    process.exit(1);
  }
}

/**
 * Global Process Handlers
 */
process.on('uncaughtException', (error: Error) => {
  console.error('[SENTINEL] [UNCAUGHT_EXCEPTION]', error);
  if (error.message.includes('ECONNREFUSED') || error.message.includes('TIMEOUT')) {
    initiateRecovery();
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[SENTINEL] [UNHANDLED_REJECTION]', reason);
  initiateRecovery();
});

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health Check
 */
app.get('/api/health', (req: Request, res: Response) => {
  const status = isRecovering ? 'recovering' : (dbConnected ? 'healthy' : 'degraded');
  res.status(isRecovering || !dbConnected ? 503 : 200).json({
    status,
    service: 'areloria-api',
    db_connected: dbConnected,
    recovery_mode: isRecovering,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Bootstrap Sequence
 */
async function bootstrap() {
  console.log('==================================================');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log('==================================================');

  try {
    // 1. Initial Connection
    await connectWithRetry();

    // 2. Start Server
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] Listening on port ${PORT}`);
    });

    // 3. Graceful Shutdown
    const shutdown = (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[SENTINEL] [SHUTDOWN] Signal ${signal} received.`);
      
      server.close(async () => {
        await db.disconnect();
        console.log('[SENTINEL] [CLEAN_EXIT] All resources released.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('[SENTINEL] [FORCE_EXIT] Shutdown timed out.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    console.error('##################################################');
    console.error(`[FATAL] BOOTSTRAP FAILED: ${error.message}`);
    console.error('##################################################');
    process.exit(1);
  }
}

bootstrap();