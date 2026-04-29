import * as fs from 'fs';
import * as path from 'path';

export interface AREPayload {
    timestamp: number;
    chunkId: string;
    entities: any[];
    events: any[];
    sequence: number;
}

export class StateLogger {
    private static instance: StateLogger;
    private logDirectory: string;
    private memoryCache: Map<string, AREPayload[]>;
    private readonly MAX_CACHE_SIZE = 1000;

    private constructor() {
        this.logDirectory = path.join(process.cwd(), 'logs', 'chunks');
        this.memoryCache = new Map<string, AREPayload[]>();
        this.ensureDirectoryExists();
    }

    public static getInstance(): StateLogger {
        if (!StateLogger.instance) {
            StateLogger.instance = new StateLogger();
        }
        return StateLogger.instance;
    }

    private ensureDirectoryExists(): void {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
    }

    public async logPayload(chunkId: string, payload: AREPayload): Promise<void> {
        let chain = this.memoryCache.get(chunkId) || [];
        chain.push(payload);

        if (chain.length > this.MAX_CACHE_SIZE) {
            await this.flushToDisk(chunkId, chain);
            chain = [];
        }

        this.memoryCache.set(chunkId, chain);
    }

    private async flushToDisk(chunkId: string, chain: AREPayload[]): Promise<void> {
        const filePath = path.join(this.logDirectory, `${chunkId}.jsonl`);
        const data = chain.map(p => JSON.stringify(p)).join('\n') + '\n';
        
        return new Promise((resolve, reject) => {
            fs.appendFile(filePath, data, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async getHistory(chunkId: string, limit: number = 100): Promise<AREPayload[]> {
        const memoryChain = this.memoryCache.get(chunkId) || [];
        if (memoryChain.length >= limit) {
            return memoryChain.slice(-limit);
        }

        const diskChain = await this.readFromDisk(chunkId, limit);
        const combined = [...diskChain, ...memoryChain];
        return combined.slice(-limit);
    }

    private async readFromDisk(chunkId: string, limit: number): Promise<AREPayload[]> {
        const filePath = path.join(this.logDirectory, `${chunkId}.jsonl`);
        
        if (!fs.existsSync(filePath)) {
            return [];
        }

        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    resolve([]);
                    return;
                }
                const lines = data.trim().split('\n');
                const payloads = lines
                    .slice(-limit)
                    .map(line => JSON.parse(line) as AREPayload);
                resolve(payloads);
            });
        });
    }

    public async clearHistory(chunkId: string): Promise<void> {
        this.memoryCache.delete(chunkId);
        const filePath = path.join(this.logDirectory, `${chunkId}.jsonl`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    public async shutdown(): Promise<void> {
        for (const [chunkId, chain] of this.memoryCache.entries()) {
            if (chain.length > 0) {
                await this.flushToDisk(chunkId, chain);
            }
        }
        this.memoryCache.clear();
    }
}