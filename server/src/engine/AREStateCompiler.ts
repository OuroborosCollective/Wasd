/**
 * AREStateCompiler.ts
 */
export class AREStateCompiler {
    compile(data: any): Buffer {
        return Buffer.from(JSON.stringify(data));
    }
}