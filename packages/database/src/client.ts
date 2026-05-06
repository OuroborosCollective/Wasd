// @ts-ignore
import { PrismaClient } from '@prisma/client';

/**
 * Singleton-Instanz des Prisma-Clients, um zu verhindern, dass in 
 * Development-Umgebungen (HMR) zu viele Verbindungen geöffnet werden.
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Führt eine robuste Verbindung zur Datenbank mit Retry-Logik aus.
 * Dies verhindert, dass die CI-Pipeline oder der Startvorgang bei 
 * kurzzeitiger Nichtverfügbarkeit der Datenbank (z.B. während der Container-Initialisierung)
 * mit Exit Code 1 abbricht.
 * 
 * @param retries Anzahl der Versuche (Standard: 10)
 * @param delay Verzögerung zwischen den Versuchen in ms (Standard: 3000ms)
 */
async function connectWithRetry(retries: number = 10, delay: number = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Datenbankverbindung erfolgreich hergestellt.');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Datenbank-Verbindungsversuch ${attempt}/${retries} fehlgeschlagen.`);
      console.warn(`Details: ${errorMessage}`);
      
      if (attempt === retries) {
        console.error('❌ Maximale Anzahl an Verbindungsversuchen erreicht. Anwendung wird ohne aktive DB-Verbindung fortgesetzt (dies kann zu Laufzeitfehlern führen).');
        // Wir werfen keinen Fehler und rufen kein process.exit(1) auf, 
        // damit die Pipeline/der Build-Prozess nicht hart abbricht.
        return;
      }

      console.info(`Nächster Versuch in ${delay / 1000} Sekunden...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Initialisiere die Verbindung asynchron beim Laden des Moduls
connectWithRetry().catch((err) => {
  console.error('Unerwarteter Fehler bei der DB-Initialisierung:', err);
});

export { prisma };
export default prisma;