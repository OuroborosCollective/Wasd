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
