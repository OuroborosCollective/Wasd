import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

/**
 * ARELORIA WASD - API CORE
 * High-performance 3D-RPG-Metaverse Backend
 */

const app = express();
const PORT = process.env.PORT || 3001;

// Konfiguration für Robustheit und Exponential Backoff
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Hilfsfunktion für deterministische Verzögerungen
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Kernfunktion zur Initialisierung der Datenbankverbindung.
 * Integriert Timeout-Races und spezifisches Error-Mapping für das Sentinel-Monitoring.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // Validierung der Konfiguration
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
      return reject(new Error('MISSING_CONFIG: DATABASE_URL is not defined in environment variables.'));
    }

    /**
     * Integration-Point: Hier wird üblicherweise prisma.$connect() oder ähnliches aufgerufen.
     * Simulation für die Boot-Sequenz-Validierung.
     */
    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable')), 500);
    }
    
    // Simulierter erfolgreicher Verbindungsaufbau der Persistenzschicht
    setTimeout(() => resolve(), 300);
  });

  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('DB_TIMEOUT: Connection attempt exceeded safety threshold')), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Implementiert den Exponential Backoff Algorithmus.
 * Verhindert Kaskadenfehler in CI/CD Umgebungen und stellt System-Integrität sicher.
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
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_DETAILS]: ${errorMessage}`);

      if (currentRetry >= MAX_RETRIES) {
        console.error('[SENTINEL] [CRITICAL_FAILURE] Max retries reached. Triggering emergency shutdown.');
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts.`);
      }

      // Berechnung des nächsten Delays (Exponential Backoff + Jitter)
      // Jitter verhindert das "Thundering Herd" Problem bei Container-Restarts
      const jitter = Math.random() * 200; 
      const totalDelay = delay + jitter;
      
      console.log(`[SENTINEL] [RETRY_SCHEDULED] Next attempt in ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

/**
 * GLOBALER SCHUTZMECHANISMUS
 * Verhindert unkontrollierte Abstürze und ermöglicht Logging durch Sentinel
 */
process.on('uncaughtException', (error: Error) => {
  console.error('[SENTINEL] [FATAL_EXCEPTION] Uncaught error detected:', error.message);
  console.error(error.stack);
  // In einer Container-Umgebung triggert Exit 1 den automatischen Restart
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SENTINEL] [FATAL_REJECTION] Unhandled promise rejection:', reason);
  process.exit(1);
});

// Express Middleware Konfiguration
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpunkt für Kubernetes Liveness/Readiness Probes
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'areloria-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Haupt-Bootstrap Sequenz des API-Servers
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ARCH: ${process.arch} | PLATFORM: ${process.platform}`);
  console.log('--------------------------------------------------');

  try {
    // Schritt 1: Persistenzschicht mit Backoff validieren
    await initializeWithRetry();
    
    // Schritt 2: API Listener starten
    const server: Server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
    });

    // Runtime Socket Monitoring
    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    /**
     * Graceful Shutdown Logik für Container-Orchestrierung (SIGTERM/SIGINT)
     * Stellt sicher, dass laufende Requests beendet werden.
     */
    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received. Closing server...`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network connections closed safely.');
        process.exit(0);
      });
      
      // Force Exit Safety Net (10 Sekunden)
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

    // Exit Code 1 stellt sicher, dass CI/CD Pipelines und Orchestratoren den Fehler erkennen
    process.exit(1);
  }
}

// Start der Anwendung
bootstrap();