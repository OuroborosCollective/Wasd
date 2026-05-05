export class Logger {
  static log(message: string, ...args: any[]) {
    console.log(`[LOG] ${message}`, ...args);
  }
  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }
  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }
  static info(message: string, ...args: any[]) {
    console.info(`[INFO] ${message}`, ...args);
  }
  static debug(message: string, ...args: any[]) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}
