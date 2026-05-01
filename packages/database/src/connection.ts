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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Helper Funktion für kontrollierte Verzögerung (Backoff).
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stellt die Verbindung zur Datenbank her und implementiert robustes Error-Handling mit Retry-Logik.
 * Dies ist essentiell für CI/CD Umgebungen, in denen der DB-Container eventuell verzögert startet.
 */
export const connectToDatabase = async (maxRetries = 5, initialDelay = 2000): Promise<void> => {
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.info(`[Database] Verbindungsversuch ${attempt}/${maxRetries}...`);
      
      // Timeout-geschützter Verbindungsaufbau
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout beim Verbindungsaufbau')), 10000)
        )
      ]);

      console.info('[Database] Verbindung erfolgreich aufgebaut.');
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.warn(`[Database] Versuch ${attempt} fehlgeschlagen: ${message}`);

      if (attempt === maxRetries) {
        console.error('[Database] KRITISCHER FEHLER: Maximale Anzahl an Verbindungsversuchen erreicht.');
        
        if (error instanceof Error) {
          console.error(`[Database] Stack: ${error.stack}`);
        }
        
        // In CI/CD soll der Prozess bei endgültigem Scheitern kontrolliert abbrechen
        throw error;
      }

      console.info(`[Database] Nächster Versuch in ${currentDelay}ms...`);
      await sleep(currentDelay);
      
      // Exponentielles Backoff
      currentDelay *= 2;
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
    // Kurzer Timeout für Healthcheck, um Hängenbleiben zu verhindern
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Healthcheck Timeout')), 3000))
    ]);
    return true;
  } catch (error) {
    console.error('[Database] Health-Check fehlgeschlagen');
    return false;
  }
};