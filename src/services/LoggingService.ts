export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    context?: any;
}

export class LoggingService {
    private static logs: LogEntry[] = [];
    private static readonly MAX_LOG_ENTRIES = 5000;

    /**
     * Protokolliert eine Information
     */
    public static info(message: string, context?: any): void {
        this.addLog(LogLevel.INFO, message, context);
    }

    /**
     * Protokolliert eine Warnung
     */
    public static warn(message: string, context?: any): void {
        this.addLog(LogLevel.WARN, message, context);
    }

    /**
     * Protokolliert einen Fehler
     */
    public static error(message: string, context?: any): void {
        this.addLog(LogLevel.ERROR, message, context);
    }

    /**
     * Protokolliert Debug-Informationen
     */
    public static debug(message: string, context?: any): void {
        this.addLog(LogLevel.DEBUG, message, context);
    }

    /**
     * Gibt alle gespeicherten Logs zurück
     */
    public static getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Löscht den Log-Speicher
     */
    public static clearLogs(): void {
        this.logs = [];
    }

    /**
     * Interne Methode zum Verarbeiten der Log-Einträge
     */
    private static addLog(level: LogLevel, message: string, context?: any): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            context
        };

        // In internem Array speichern
        this.logs.push(entry);

        // Begrenzung des Speichers
        if (this.logs.length > this.MAX_LOG_ENTRIES) {
            this.logs.shift();
        }

        // Ausgabe in die Browser-Konsole
        this.printToConsole(entry);
    }

    /**
     * Formatierte Ausgabe in die Konsole
     */
    private static printToConsole(entry: LogEntry): void {
        const timestampStr = entry.timestamp.toISOString();
        const msg = `[${timestampStr}] [${entry.level}] ${entry.message}`;

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(msg, entry.context || '');
                break;
            case LogLevel.INFO:
                console.info(msg, entry.context || '');
                break;
            case LogLevel.WARN:
                console.warn(msg, entry.context || '');
                break;
            case LogLevel.ERROR:
                console.error(msg, entry.context || '');
                break;
            default:
                console.log(msg, entry.context || '');
        }
    }
}