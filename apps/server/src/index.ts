import express from 'express';
import { createServer } from 'http';
import * as dotenv from 'dotenv';

// Initialisierung der Umgebungsvariablen
dotenv.config();

/**
 * Simuliert oder importiert die Datenbankverbindung.
 * In einem realen WASD-Szenario würde hier z.B. Prisma oder ein TypeORM-Client initialisiert werden.
 */
async function connectToDatabase(): Promise<void> {
    // Hier die tatsächliche DB-Logik implementieren
    // Beispiel: await prisma.$connect();
    console.log('Versuche Datenbankverbindung herzustellen...');
    
    // Test auf DB_URL Vorhandensein als einfaches Fehlerbeispiel
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL ist nicht definiert.');
    }
}

async function bootstrap() {
    try {
        // 1. Datenbank-Initialisierung mit expliziter Fehlerbehandlung
        try {
            await connectToDatabase();
            console.info('Datenbankverbindung erfolgreich aufgebaut.');
        } catch (dbError) {
            console.error('FEHLER BEIM DATENBANK-START:');
            if (dbError instanceof Error) {
                console.error(`Nachricht: ${dbError.message}`);
                console.error(`Stack: ${dbError.stack}`);
            } else {
                console.error(String(dbError));
            }
            // Beende den Prozess mit Exit-Code 1 (Error)
            process.exit(1);
        }

        // 2. Server-Setup
        const app = express();
        const server = createServer(app);
        const port = process.env.PORT || 4000;

        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // 3. Server starten
        server.listen(port, () => {
            console.info(`Server erfolgreich gestartet auf Port ${port}`);
        });

        // Graceful Shutdown
        const shutdown = () => {
            console.info('Server wird beendet...');
            server.close(() => {
                console.info('HTTP-Server geschlossen.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (fatalError) {
        console.error('Ein kritischer, unbehandelter Fehler ist beim Bootstrapping aufgetreten:');
        console.error(fatalError);
        process.exit(1);
    }
}

// Bootstrap-Prozess starten
bootstrap();