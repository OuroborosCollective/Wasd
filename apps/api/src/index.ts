import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

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
 * Beinhaltet verbessertes Logging für externe Deployment-Services.
 */
async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log(`[${new Date().toISOString()}] INITIALIZING WASD API`);
  console.log('--------------------------------------------------');

  try {
    // Hier können zukünftige Initialisierungen wie Datenbank-Verbindungen (Prisma/TypeORM)
    // oder asynchrone Services geladen werden.
    
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
    // Verbessertes Logging für Vercel Dashboards und andere Log-Aggregatoren
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

    // Beende den Prozess mit Fehlercode, damit Deployment-Pipelines fehlschlagen
    process.exit(1);
  }
}

// Startvorgang triggern
bootstrap();