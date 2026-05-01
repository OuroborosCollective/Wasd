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

/**
 * Stellt die Verbindung zur Datenbank her und implementiert robustes Error-Handling.
 * Verhindert Unhandled Promise Rejections für CI/CD Stabilität.
 */
export const connectToDatabase = async (): Promise<void> => {
  try {
    console.info('[Database] Versuche Verbindung herzustellen...');
    await prisma.$connect();
    console.info('[Database] Verbindung erfolgreich aufgebaut.');
  } catch (error: unknown) {
    console.error('[Database] KRITISCHER FEHLER: Verbindung zur Datenbank fehlgeschlagen.');
    
    if (error instanceof Error) {
      console.error(`[Database] Fehlermeldung: ${error.message}`);
      console.error(`[Database] Stack: ${error.stack}`);
    } else {
      console.error('[Database] Unbekannter Fehlertyp:', error);
    }

    // Wir werfen den Fehler erneut, damit der Prozess (z.B. CI Job oder Server) 
    // kontrolliert mit einem Exit-Code ungleich 0 abbrechen kann, falls gewünscht.
    throw error;
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
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
};