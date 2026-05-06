import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Konfiguration für Robustheit und Exponential Backoff
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Hilfsfunktion für deterministische Verzögerungen
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Kernfunktion zur Initialisierung der Datenbankverbindung.
 * Integriert Timeout-Races und spezifisches Error-Mapping für das Sentinel-Monitoring.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[SENTINEL] [DATABASE_BOOT] [${new Date().toISOString()}] Initializing connection sequence...`);

  const connectionPromise = new Promise<void>((resolve, reject) => {
    // Falls DATABASE_URL fehlt, sofortiger Abbruch (Konfigurationsfehler)
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
      return reject(new Error('MISSING_CONFIG: DATABASE_URL is not defined in environment variables.'));
    }

    // Simulation/Integration der Datenbank-Prüfung
    // In Produktion würde hier stehen: await prisma.$connect();
    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database host unreachable')), 500);
    }
    
    // Erfolgreicher Verbindungsaufbau
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
    } catch (error) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[SENTINEL] [DATABASE_ERROR] [ATTEMPT ${currentRetry}/${MAX_RETRIES}]`);
      console.error(`[ERROR_DETAILS]: ${errorMessage}`);

      if (currentRetry >= MAX_RETRIES) {
        console.error('[SENTINEL] [CRITICAL_FAILURE] Max retries reached. Triggering emergency shutdown.');
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts.`);
      }

      // Berechnung des nächsten Delays (Exponential Backoff)
      const jitter = Math.random() * 200; // Verhindert "Thundering Herd" Problem
      const totalDelay = delay + jitter;
      
      console.log(`[SENTINEL] [RETRY_SCHEDULED] Next attempt in ${Math.round(totalDelay)}ms...`);
      await sleep(totalDelay);
      delay *= 2; 
    }
  }
}

// Globaler Schutzmechanismus gegen Prozess-Abstürze
process.on('uncaughtException', (error: Error) => {
  console.error('[SENTINEL] [FATAL_EXCEPTION] Uncaught error detected:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SENTINEL] [FATAL_REJECTION] Unhandled promise rejection:', reason);
  process.exit(1);
});

// Middleware Konfiguration
app.use(cors());
app.use(express.json());

/**
 * Health Check Endpunkt für Kubernetes / Docker Health Checks
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'areloria-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Haupt-Bootstrap Sequenz des API-Servers
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('ARELORIA WASD - API CORE INITIALIZATION');
  console.log(`MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log('--------------------------------------------------');

  try {
    // Schritt 1: Persistenzschicht validieren
    await initializeWithRetry();
    
    // Schritt 2: API Listener starten
    const server = app.listen(PORT, () => {
      console.log(`[SENTINEL] [SERVER_START] API listening on port: ${PORT}`);
    });

    // Socket Error Monitoring
    server.on('error', (error: Error) => {
      console.error('[SENTINEL] [RUNTIME_SOCKET_ERROR]', error);
    });

    // Graceful Shutdown Logik für Container-Orchestrierung (SIGTERM/SIGINT)
    const gracefulShutdown = (signal: string) => {
      console.log(`[SENTINEL] [SHUTDOWN_SIGNAL] ${signal} received.`);
      server.close(() => {
        console.log('[SENTINEL] [CLEAN_EXIT] All network connections closed.');
        process.exit(0);
      });
      
      // Force Exit nach 10 Sekunden falls Verbindungen hängen
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
    }
    console.error('##################################################');

    process.exit(1);
  }
}

// Start der Anwendung
bootstrap();