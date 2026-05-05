export class Logger {
  constructor(private context: string) {}
  log(message: string, ...args: any[]) {
    console.log(`[${this.context}] ${message}`, ...args);
  }
  error(message: string, ...args: any[]) {
    console.error(`[${this.context}] ${message}`, ...args);
  }
  warn(message: string, ...args: any[]) {
    console.warn(`[${this.context}] ${message}`, ...args);
  }
}
