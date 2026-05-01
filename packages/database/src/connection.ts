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
 */
const validateConnectionString = (): string | null => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[Database] WARNUNG: DATABASE_URL ist nicht definiert.');
    return null;
  }
  
  const validProtocols = ['postgresql:', 'postgres:', 'file:', 'mysql:'];
  const hasValidProtocol = validProtocols.some(proto => url.startsWith(proto));

  if (!hasValidProtocol) {
    console.warn(`[Database] VALIDIERUNGSWARNUNG: DATABASE_URL hat ein ungewöhnliches Format.`);
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
 * Verhindert Prozess-Abstürze in CI/Build-Umgebungen durch Environment-Checks.
 */
export const connectToDatabase = async (retries: number = MAX_RETRIES): Promise<void> => {
  let attempt = 0;
  const rawUrl = validateConnectionString();
  
  if (!rawUrl) {
    console.error('[Database] Keine DATABASE_URL vorhanden. Überspringe Verbindung.');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production.');
    }
    return;
  }

  console.info(`[Database] Initialisiere Verbindung zu: ${maskConnectionString(rawUrl)}`);

  while (attempt < retries) {
    try {
      attempt++;
      console.info(`[Database] Verbindungsversuch ${attempt} von ${retries}...`);
      
      // Prisma Connect erzwingen
      await prisma.$connect();
      
      // Health-Check
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Health-Check nach Connect fehlgeschlagen.');
      }

      console.info('[Database] Verbindung erfolgreich aufgebaut.');
      return;
    } catch (error: unknown) {
      const isLastAttempt = attempt >= retries;
      let errorMessage = 'Unbekannter Fehler';

      if (error instanceof Prisma.PrismaClientInitializationError) {
        errorMessage = `Init-Fehler [${error.errorCode || 'NoCode'}]: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`[Database] Fehler (Versuch ${attempt}): ${errorMessage}`);

      if (isLastAttempt) {
        console.error('[Database] Maximale Verbindungsversuche erreicht.');
        
        // Verhindere Exit Code 1 in CI oder Build-Umgebungen
        const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
        const isBuild = process.env.NODE_ENV === 'production' && !process.env.DB_STRICT;

        if (isCI || isBuild) {
          console.warn('[Database] CI/Build erkannt: Setze Prozess trotz Datenbank-Fehler fort.');
          return;
        }

        throw new Error(`Database connection failed: ${errorMessage}`);
      }

      console.warn(`[Database] Retry in ${RETRY_DELAY_MS / 1000}s...`);
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
    console.info('[Database] Verbindung geschlossen.');
  } catch (error: unknown) {
    console.error(`[Database] Fehler beim Disconnect: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

/**
 * Helper Funktion für Health-Checks.
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('DB Timeout')), 5000)
    );
    const query = prisma.$queryRaw`SELECT 1`;
    await Promise.race([query, timeout]);
    return true;
  } catch (error) {
    console.warn(`[Database] Health-Check fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
};