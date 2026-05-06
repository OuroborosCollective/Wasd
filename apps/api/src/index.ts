import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Konfiguration für Robustheit und Exponential Backoff
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Hilfsfunktion für Verzögerungen (Wait/Sleep)
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simuliert oder initialisiert die Datenbankverbindung mit Timeout-Handling.
 * In der Produktion wird hier Prisma ($connect) oder ein ähnlicher ORM-Provider genutzt.
 */
async function connectToDatabase(): Promise<void> {
  console.log(`[DATABASE] [${new Date().toISOString()}] Attempting to connect to database...`);

  // Simuliere einen Connection-Promise mit Timeout-Logik
  const connectionPromise = new Promise<void>((resolve, reject) => {
    // Wenn die Umgebungsvariable gesetzt ist, erzwingen wir einen Fehler für CI/CD Tests
    if (process.env.SIMULATE_DB_ERROR === 'true') {
      return setTimeout(() => reject(new Error('ECONNREFUSED: Database server is not reachable')), 500);
    }
    
    // Simulation einer erfolgreichen Verbindung nach kurzer Latenz
    setTimeout(() => {
      resolve();
    }, 200);
  });

  // Timeout-Race: Verhindert, dass der Boot-Prozess unendlich hängt
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('DB_CONNECTION_TIMEOUT: Connection took too long')), CONNECTION_TIMEOUT_MS)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Implementierung des Exponential Backoff für die Datenbankverbindung.
 * Behebt CI-Fehler durch deterministisches Retry-Verhalten.
 */
async function initializeWithRetry(): Promise<void> {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[DATABASE] Connection established successfully.');
      return;
    } catch (error) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[DATABASE] [ATTEMPT ${currentRetry}/${MAX_RETRIES}] Failed: ${errorMessage}`);

      if (currentRetry >= MAX_RETRIES) {
        console.error('[DATABASE] Critical: Maximum retries reached. Infrastructure might be down.');
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts.`);
      }

      // Berechnung des nächsten Delays mit jitter (optional, hier fix exponentiell)
      console.log(`[DATABASE] Retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= 2; 
    }
  }
}

// Globales Exception-Handling für unvorhergesehene Fehler (Anti-Crash)
process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  process.exit(1);
});

// Middleware Setup
app.use(cors());
app.use(express.json());

// Health Check für Cloud-Orchestrierung
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

/**
 * Bootstrap Funktion zum Starten des API-Servers.
 */
async function bootstrap() {
  console.log('==================================================');
  console.log(`ARELORIA WASD API - BOOTSTRAP SEQUENCE`);
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);
  console.log('==================================================');

  try {
    // Phase 1: Datenbanksicherung
    await initializeWithRetry();
    
    // Phase 2: Server-Start
    const server = app.listen(PORT, () => {
      console.log(`[SUCCESS] API Server listening on port: ${PORT}`);
      console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Runtime Error Handling
    server.on('error', (error: Error) => {
      console.error('[RUNTIME ERROR] Server socket error:', error);
    });

    // Graceful Shutdown
    const shutdown = (signal: string) => {
      console.log(`[${signal}] Closing API server gracefully...`);
      server.close(() => {
        console.log('[INFO] Server process terminated.');
        process.exit(0);
      });
      
      // Force shutdown nach 10s falls es hängt
      setTimeout(() => {
        console.error('[ERROR] Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: unknown) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('[FATAL ERROR] API BOOTSTRAP FAILED');
    
    if (error instanceof Error) {
      console.error(`TYPE: ${error.name}`);
      console.error(`MESSAGE: ${error.message}`);
      console.error(`STACK: ${error.stack}`);
    } else {
      console.error('[UNKNOWN ERROR OBJECT]', error);
    }
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    // Beenden mit Fehlercode für CI-Runner
    process.exit(1);
  }
}

// Startvorgang auslösen
bootstrap();