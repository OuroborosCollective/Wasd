export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class LoggingService {
    private static level: LogLevel = LogLevel.INFO;

    static setLevel(level: LogLevel): void {
        this.level = level;
    }

    static log(level: LogLevel, msg: string, ...args: any[]): void {
        if (level < this.level) return;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug('%s', msg, ...args);
                break;
            case LogLevel.INFO:
                console.info('%s', msg, ...args);
                break;
            case LogLevel.WARN:
                console.warn('%s', msg, ...args);
                break;
            case LogLevel.ERROR:
                console.error('%s', msg, ...args);
                break;
        }
    }
}