declare module '@prisma/client' {
  export class PrismaClient {
    constructor(config?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
  export namespace Prisma {
    export class PrismaClientInitializationError extends Error {}
    export class PrismaClientKnownRequestError extends Error {
      code: string;
    }
  }
}
declare module '@wasd/utils' {
  export class Logger {
    constructor(name?: string);
    log(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
    static log(msg: string, ...args: any[]): void;
    static info(msg: string, ...args: any[]): void;
    static warn(msg: string, ...args: any[]): void;
    static error(msg: string, ...args: any[]): void;
    static debug(msg: string, ...args: any[]): void;
  }
}
