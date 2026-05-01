import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Globaler PrismaClient-Handler für Node.js Umgebungen (verhindert Erschöpfung von Connection-Pools in Dev-Hot-Reloading).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Maskiert sensitive Informationen im Connection-String für Logging-Zwecke.
 */
const maskConnectionString = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return '--- INVALID URL ---';
  }
};

/**
 * Validiert den Datenbank-Connection-String aus den Umgebungsvariablen.
 * Wirft einen Fehler, wenn die DATABASE_URL nicht gesetzt oder offensichtlich ungültig ist.
 */
const validateConnectionString = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[Database] KRITISCHER FEHLER: DATABASE_URL ist nicht definiert (undefined).');
  }
  
  const validProtocols = ['postgresql:', 'postgres:', 'file:', 'mysql:'];
  const hasValidProtocol = validProtocols.some(proto => url.startsWith(proto));

  if (!hasValidProtocol) {
    throw new Error(`[Database] VALIDIERUNGSFEHLER: DATABASE_URL hat ein ungültiges Format. Erwartet: ${validProtocols.join(', ')}`);
  }
  return url;
};

/**
 * Initialisiert den Prisma Client mit optimierten Log-Einstellungen.
 */
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
 * Behandelt spezifische Prisma-Fehlertypen und verhindert unkontrollierte Abstürze.
 */
export const connectToDatabase = async (retries: number = MAX_RETRIES): Promise<void> => {
  let attempt = 0;

  // Vorab-Validierung des Connection-Strings
  try {
    const rawUrl = validateConnectionString();
    console.info(`[Database] Initialisiere Verbindung zu: ${maskConnectionString(rawUrl)}`);
  } catch (validationError) {
    const msg = validationError instanceof Error ? validationError.message : 'Unbekannter Validierungsfehler';
    console.error(`[Database] Konfigurationsfehler: ${msg}`);
    throw validationError; // Re-throw da ohne URL kein Start möglich
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
        throw new Error('Health-Check nach erfolgreichem Connect fehlgeschlagen (Reaktionszeit-Timeout).');
      }

      console.info('[Database] Verbindung erfolgreich aufgebaut und verifiziert.');
      return;
    } catch (error: unknown) {
      const isLastAttempt = attempt >= retries;
      let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';

      if (error instanceof Prisma.PrismaClientInitializationError) {
        errorMessage = `Initialisierungsfehler (${error.errorCode || 'Kein Code'}): ${error.message}`;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        errorMessage = `Bekannter Request-Fehler (${error.code}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`[Database] Fehler beim Verbindungsaufbau (Versuch ${attempt}): ${errorMessage}`);

      if (isLastAttempt) {
        console.error('[Database] KRITISCHER FEHLER: Maximale Anzahl an Verbindungsversuchen erreicht. Dienst wird instabil sein.');
        
        if (error instanceof Error && error.stack && process.env.NODE_ENV === 'development') {
          console.error(`[Database] Stack-Trace: ${error.stack}`);
        }
        
        // In CI Umgebungen werfen wir den Fehler, um den Build/Start zu stoppen.
        // In einer resilienten Server-Umgebung könnte man hier auch "return" nutzen, 
        // falls der Dienst ohne DB (eingeschränkt) weiterlaufen soll.
        throw new Error(`Database connection failed after ${retries} attempts: ${errorMessage}`);
      }

      console.warn(`[Database] Warte ${RETRY_DELAY_MS / 1000}s bis zum nächsten Versuch...`);
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
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Disconnect';
    console.error(`[Database] Fehler beim Schließen der Datenbankverbindung: ${msg}`);
  }
};

/**
 * Helper Funktion für Health-Checks.
 * Führt eine einfache Raw-Query aus, um die tatsächliche Reaktionsfähigkeit der DB zu prüfen.
 * Implementiert einen internen Timeout, um Hänger zu vermeiden.
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Verwendet einen Race-Condition Wrapper für manuelles Timeout-Handling bei Healthchecks
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database health check timed out')), 5000)
    );
    
    const query = prisma.$queryRaw`SELECT 1`;
    
    await Promise.race([query, timeout]);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unbekannt';
    console.warn(`[Database] Health-Check fehlgeschlagen: ${msg}`);
    return false;
  }
};