import { PrismaClient } from '@prisma/client';

/**
 * Globaler PrismaClient-Handler für Node.js Umgebungen (verhindert Erschöpfung von Connection-Pools in Dev-Hot-Reloading).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Validiert den Datenbank-Connection-String aus den Umgebungsvariablen.
 * Wirft einen Fehler, wenn die DATABASE_URL nicht gesetzt oder offensichtlich ungültig ist.
 */
const validateConnectionString = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[Database] KRITISCHER FEHLER: DATABASE_URL ist nicht in der Umgebung definiert.');
  }
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://') && !url.startsWith('file:') && !url.startsWith('mysql://')) {
    throw new Error('[Database] VALIDIERUNGSFEHLER: DATABASE_URL hat ein ungültiges Format.');
  }
  return url;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Helper Funktion für Verzögerungen.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stellt die Verbindung zur Datenbank her und implementiert robustes Error-Handling inklusive Retry-Mechanismus.
 * Dies verhindert Unhandled Promise Rejections und sorgt für Stabilität in CI/CD Umgebungen.
 */
export const connectToDatabase = async (retries: number = MAX_RETRIES): Promise<void> => {
  let attempt = 0;

  // Vorab-Validierung des Connection-Strings
  try {
    validateConnectionString();
  } catch (validationError) {
    console.error(validationError instanceof Error ? validationError.message : 'Unbekannter Validierungsfehler');
    throw validationError;
  }

  while (attempt < retries) {
    try {
      attempt++;
      console.info(`[Database] Verbindungsversuch ${attempt} von ${retries}...`);
      
      // Prisma Connect erzwingen
      await prisma.$connect();
      
      // Zusätzlicher Health-Check nach dem Connect
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Health-Check nach Verbindung fehlgeschlagen.');
      }

      console.info('[Database] Verbindung erfolgreich aufgebaut und verifiziert.');
      return;
    } catch (error: unknown) {
      const isLastAttempt = attempt >= retries;
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      console.error(`[Database] Fehler beim Verbindungsaufbau (Versuch ${attempt}): ${errorMessage}`);

      if (isLastAttempt) {
        console.error('[Database] KRITISCHER FEHLER: Maximale Anzahl an Verbindungsversuchen erreicht.');
        
        if (error instanceof Error && error.stack) {
          console.error(`[Database] Stack-Trace: ${error.stack}`);
        }
        
        // Finaler Throw für CI/CD Fail-Fast
        throw error;
      }

      console.warn(`[Database] Erneuter Versuch in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
};

/**
 * Schließt die Datenbankverbindung kontrolliert.
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.info('[Database] Verbindung erfolgreich geschlossen.');
  } catch (error: unknown) {
    console.error('[Database] Fehler beim Schließen der Datenbankverbindung:');
    if (error instanceof Error) {
      console.error(`[Database] ${error.message}`);
    }
  }
};

/**
 * Helper Funktion für Health-Checks.
 * Führt eine einfache Raw-Query aus, um die tatsächliche Reaktionsfähigkeit der DB zu prüfen.
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Timeout-gesicherte Query (Prisma intern)
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannt';
    console.warn(`[Database] Health-Check fehlgeschlagen: ${msg}`);
    return false;
  }
};