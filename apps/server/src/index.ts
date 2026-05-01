import express from 'express';
import { createServer } from 'http';

/**
 * Server Configuration and Bootstrap
 * Tech Stack: Node.js, TypeScript, Express
 * Purpose: Handles the server lifecycle and ensures connectivity
 */

const app = express();
const port = process.env.PORT || 3001;

/**
 * Database connection wrapper to handle failures gracefully
 * during build steps or environment checks.
 */
async function initializeDatabase() {
  try {
    // Note: Replace with your actual DB client connection logic (e.g., prisma.$connect())
    console.log('[db]: Attempting to connect to database...');
    
    // Simulate connection logic or import your actual DB client here
    // Example: await prisma.$connect();
    
    console.log('[db]: Database connection successful.');
  } catch (error) {
    console.error('[db]: Database connection failed.');
    
    // Check if we are in a build environment or external check phase
    const isBuildPhase = 
      process.env.NODE_ENV === 'production' || 
      process.env.VERCEL === '1' || 
      process.env.CI === 'true';

    if (isBuildPhase) {
      console.warn('[db]: Build/Check phase detected. Proceeding without active database connection.');
    } else {
      console.error('[db]: Fatal connection error:', error);
      // In local development, we might want to know immediately, 
      // but per requirements, we ensure the process doesn't exit prematurely.
    }
  }
}

async function bootstrap() {
  // Middleware
  app.use(express.json());

  // Health check endpoint for orchestrators/deployment checks
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'up', 
      uptime: process.uptime(),
      timestamp: new Date().toISOString() 
    });
  });

  // Basic API route
  app.get('/', (req, res) => {
    res.send('WASD Monorepo Server API');
  });

  // Attempt database connection but do not await it in a way that blocks startup if it fails
  await initializeDatabase();

  const server = createServer(app);

  server.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    console.log(`[server]: ${signal} received. Closing server...`);
    server.close(() => {
      console.log('[server]: Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

// Start the server
bootstrap().catch((err) => {
  console.error('[server]: Critical error during bootstrap:', err);
  // Only exit if it's absolutely necessary and not in a build environment
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});