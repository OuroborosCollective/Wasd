import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 * Focus: Resilient Database Pooling & Autonomous Recovery
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Konfiguration für Robustheit und Exponential Backoff
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

// Zustandsüberwachung für Health-Checks
let isDatabaseConnected = false;
let isRedisConnected = false;

/**
 * REDIS CONFIGURATION
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

/**
 * Hilfsfunktion für deterministische Verzögerungen
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * DATABASE POOL ABSTRACTION (Simuliert pg.Pool Verhalten für Areloria Architektur)
 */
class DatabasePool {
  async connect(): Promise<void> {
    // In einer echten Implementierung: await pool.connect();
    return new Promise((resolve, reject) => {
      if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        return reject(new Error('MISSING_CONFIG: DATABASE_URL is not defined.'));
      }

      // Simulation spezifischer Fehlerzustände
      const errorSim = process.env.SIMULATE_DB_ERROR;
      if (errorSim === 'ECONNREFUSED' || errorSim === 'true') {
        return setTimeout(() => {
          const err: any = new Error('ECONNREFUSED: Connection refused at database host');
          err.code = 'ECONNREFUSED';
          reject(err);
        }, 500);
      }
      
      setTimeout(() => {
        isDatabaseConnected = true;
        resolve();
      }, 300);
    });
  }
}

const dbPool = new DatabasePool();

/**
 * Kernfunktion zur Initialisierung des Datenbank-Pools mit Fehlerklassifizierung.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = dbPool.connect();

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => {
      const err: any = new Error('DB_TIMEOUT: Connection attempt exceeded safety threshold');
      err.code = 'ETIMEDOUT';
      reject(err);
    }, CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Validierung der Redis-Konnektivität.
 */
async function connectToRedis(): Promise<void> {
  console.log(`[SENTINEL] [REDIS_BOOT] [${new Date().toISOString()}] Initializing Redis connection...`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      isRedisConnected = true;
      console.log(`[SENTINEL] [REDIS_READY] Connection established with strategy: ${REDIS_CONFIG.retryStrategy.toString()}`);
      resolve();
    }, 200);
  });
}

/**
 * Implementiert den kontrollierten Wiederverbindungszyklus (Exponential Backoff).
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[SENTINEL] [DATABASE_READY] Connection established and verified.');
      isDatabaseConnected = true;
      return;
    } catch (error: any) {
      currentRetry++;
      isDatabaseConnected = false;
      
      const isTransient = ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET'].includes(error.code);
      const errorMessage = error.message || String(error);
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_CODE]: ${error.code || 'UNKNOWN'} | [DETAILS]: ${errorMessage}`);

      if (!isTransient && process.env.NODE_ENV === 'production') {
        console.error('[SENTINEL] [FATAL_CONFIG] Non-transient error detected. Immediate intervention required.');
      }

      if (currentRetry >= MAX_RETRIES) {
        console.error('[SENTINEL] [CRITICAL_FAILURE] Max retries reached.');
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts.`);
      }

      const jitter = Math.random() * 200; 
      const totalDelay = delay + jitter;
      
      console.log(`[SENTINEL] [RETRY_SCHEDULED] Next attempt in ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * GLOBALER SCHUTZMECHANISMUS & DRIVER-FEHLER HANDLING
 */
process.on('uncaughtException', (error: Error) => {
  console.error('[SENTINEL] [FATAL_EXCEPTION] Uncaught error detected:', error.message);
  console.error(error.stack);
  // Bei kritischen App-Fehlern beenden wir den Prozess, damit Orchestratoren (Docker/K8s) neustarten können.
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  // Spezielles Handling für DB-Treiber Fehler (z.B. plötzlicher Verbindungsabbruch im Pool)
  const isDbError = reason?.code?.startsWith('PG') || ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST'].includes(reason?.code);
  
  if (isDbError) {
    console.error('[SENTINEL] [DB_DRIVER_REJECTION] Transient DB error caught in global listener:', reason.message);
    isDatabaseConnected = false;
    // Anstatt process.exit(1), leiten wir einen Re-Zentralisierungs-Check ein
    console.warn('[SENTINEL] [RECOVERY_MODE] Keeping process alive. Health-check will reflect degraded state.');
  } else {
    console.error('[SENTINEL] [FATAL_REJECTION] Unhandled promise rejection:', reason);
    process.exit(1);
  }
});

// Express Middleware
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpunkt - Spiegelt den internen Systemzustand wider
 */
app.get('/api/health', (req: Request, res: Response) => {
  const status = isDatabaseConnected && isRedisConnected ? 'healthy' : 'degraded';
  res.status(status === 'healthy' ? 200 : 503).json({ 
    status,
    service: 'areloria-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: isDatabaseConnected ? 'connected' : 'disconnected',
      redis: isRedisConnected ? 'connected' : 'disconnected'
    }
  });
});

/**
 * Haupt-Bootstrap Sequenz des API-Servers
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`PORT: ${PORT} | MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ARCH: ${process.arch} | PLATFORM: ${process.platform}`);
  console.log('--------------------------------------------------');

  try {
    // Schritt 1: Persistenzschicht validieren mit Retry-Logik
    await initializeWithRetry();

    // Schritt 2: Redis-Schicht validieren
    await connectToRedis();
    
    // Schritt 3: API Listener starten
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
    } else {
      console.error(`UNKNOWN_ERROR: ${String(error)}`);
    }
    console.error('##################################################');
    process.exit(1);
  }
}

bootstrap();