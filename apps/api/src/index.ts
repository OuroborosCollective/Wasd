import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Konfiguration für Exponential Backoff
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Hilfsfunktion für Verzögerungen (Wait/Sleep)
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simuliert oder initialisiert die Datenbankverbindung.
 * In einer realen Umgebung würde hier Prisma, TypeORM oder Mongoose initialisiert werden.
 */
async function connectToDatabase(): Promise<void> {
  // Platzhalter für tatsächliche DB-Logik: e.g., await prisma.$connect();
  console.log('[DATABASE] Attempting to connect to database...');
  
  // Simulation eines Verbindungsaufbaus
  // Falls die Datenbank noch nicht bereit ist (z.B. im Docker-Stack), wird hier ein Error geworfen.
  if (process.env.SIMULATE_DB_ERROR === 'true') {
    throw new Error('Database connection failed (Simulated)');
  }
}

/**
 * Implementierung des Exponential Backoff für die Datenbankverbindung.
 */
async function initializeWithRetry() {
  let currentRetry = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (currentRetry < MAX_RETRIES) {
    try {
      await connectToDatabase();
      console.log('[DATABASE] Connection established successfully.');
      return; // Erfolg, Schleife verlassen
    } catch (error) {
      currentRetry++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.warn(`[DATABASE] Connection attempt ${currentRetry} failed: ${errorMessage}`);

      if (currentRetry >= MAX_RETRIES) {
        console.error('[DATABASE] Maximum retries reached. Could not connect to database.');
        throw error;
      }

      console.log(`[DATABASE] Retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= 2; // Exponentielle Steigerung
    }
  }
}

// Standard Middleware
app.use(express.json());

// Health Check für Deployment-Monitoring (Vercel/Cloud-Provider)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

/**
 * Bootstrap Funktion zum Starten des API-Servers.
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log(`[${new Date().toISOString()}] INITIALIZING WASD API`);
  console.log('--------------------------------------------------');

  try {
    // Starte DB-Verbindung mit Retry-Logik bevor der Server Requests annimmt
    await initializeWithRetry();
    
    console.log(`[BOOTSTRAP] Configuration: Port=${PORT}, NodeEnv=${process.env.NODE_ENV}`);

    const server = app.listen(PORT, () => {
      console.log(`[SUCCESS] API Server is running on port: ${PORT}`);
      console.log(`[INFO] Ready for requests.`);
    });

    // Error Handling für den laufenden Server-Prozess
    server.on('error', (error: Error) => {
      console.error('[RUNTIME ERROR] Server encountered an error:');
      console.error(error);
    });

    // Graceful Shutdown handling
    process.on('SIGTERM', () => {
      console.log('[SIGTERM] Closing server...');
      server.close(() => {
        console.log('[INFO] Server closed.');
        process.exit(0);
      });
    });

  } catch (error: unknown) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('[FATAL ERROR] FAILED TO BOOTSTRAP API SERVER');
    console.error(`[TIME] ${new Date().toISOString()}`);
    
    if (error instanceof Error) {
      console.error(`[ERROR MESSAGE] ${error.message}`);
      console.error(`[STACK TRACE]\n${error.stack}`);
    } else {
      console.error('[UNKNOWN ERROR]', error);
    }
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    // Beende den Prozess nur nach fehlgeschlagenen Retries
    process.exit(1);
  }
}

// Startvorgang triggern
bootstrap();