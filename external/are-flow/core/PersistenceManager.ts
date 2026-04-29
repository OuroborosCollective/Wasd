import * as fs from 'fs';
import * as path from 'path';

export interface StateEnvelope<T> {
    id: string;
    timestamp: number;
    payload: T;
}

export class PersistenceManager {
    private readonly storagePath: string;
    private readonly driver: string;

    constructor(customStoragePath: string = './persistence_store') {
        this.driver = process.env.PERSISTENCE_DRIVER || 'file';
        this.storagePath = path.resolve(customStoragePath);
        this.initializeStorage();
    }

    private initializeStorage(): void {
        if (this.driver === 'file') {
            if (!fs.existsSync(this.storagePath)) {
                fs.mkdirSync(this.storagePath, { recursive: true });
            }
        }
    }

    public async saveState<T>(id: string, state: T): Promise<void> {
        if (this.driver === 'file') {
            const filePath = path.join(this.storagePath, `${id}.json`);
            const envelope: StateEnvelope<T> = {
                id,
                timestamp: Date.now(),
                payload: state
            };

            try {
                const data = JSON.stringify(envelope, null, 0);
                await fs.promises.writeFile(filePath, data, 'utf-8');
            } catch (error) {
                throw new Error(`Failed to save state for ${id}: ${error}`);
            }
        } else {
            throw new Error(`Persistence driver '${this.driver}' is not supported.`);
        }
    }

    public async loadState<T>(id: string): Promise<T | null> {
        if (this.driver === 'file') {
            const filePath = path.join(this.storagePath, `${id}.json`);
            
            if (!fs.existsSync(filePath)) {
                return null;
            }

            try {
                const data = await fs.promises.readFile(filePath, 'utf-8');
                const envelope: StateEnvelope<T> = JSON.parse(data);
                return envelope.payload;
            } catch (error) {
                throw new Error(`Failed to load state for ${id}: ${error}`);
            }
        } else {
            throw new Error(`Persistence driver '${this.driver}' is not supported.`);
        }
    }

    public async deleteState(id: string): Promise<void> {
        if (this.driver === 'file') {
            const filePath = path.join(this.storagePath, `${id}.json`);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        }
    }

    public async listStoredIds(): Promise<string[]> {
        if (this.driver === 'file') {
            const files = await fs.promises.readdir(this.storagePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        }
        return [];
    }
}