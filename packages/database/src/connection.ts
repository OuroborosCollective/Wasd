import { PrismaClient } from '@prisma/client';

/**
 * Globaler PrismaClient-Handler für Node.js Umgebungen (verhindert Erschöpfung von Connection-Pools in Dev-Hot-Reloading).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
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

  while (attempt < retries) {
    try {
      attempt++;
      console.info(`[Database] Verbindungsversuch ${attempt} von ${retries}...`);
      
      await prisma.$connect();
      
      console.info('[Database] Verbindung erfolgreich aufgebaut.');
      return;
    } catch (error: unknown) {
      const isLastAttempt = attempt >= retries;
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      console.error(`[Database] Fehler beim Verbindungsaufbau (Versuch ${attempt}): ${errorMessage}`);

      if (isLastAttempt) {
        console.error('[Database] KRITISCHER FEHLER: Maximale Anzahl an Verbindungsversuchen erreicht.');
        
        if (error instanceof Error && error.stack) {
          console.error(`[Database] Stack: ${error.stack}`);
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
 * Helper Funktion für Health-Checks
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Einfacher Query um die Erreichbarkeit zu prüfen
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn('[Database] Health-Check fehlgeschlagen');
    return false;
  }
};