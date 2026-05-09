// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

interface IFS {
    watch(path: string, options: any, callback: (event: string, filename: string | null) => void): fs.FSWatcher;
    readFile(path: string): Promise<Buffer>;
    exists(path: string): Promise<boolean>;
}

class FSAL implements IFS {
    watch(path: string, options: any, callback: (event: string, filename: string | null) => void): fs.FSWatcher {
        return fs.watch(path, options, callback as any);
    }
    async readFile(filePath: string): Promise<Buffer> {
        return fs.promises.readFile(filePath);
    }
    async exists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

interface S3Config {
    bucket: string;
    region: string;
    endpoint: string;
}

export class AssetWatcherCloud extends EventEmitter {
    private fsal: IFS;
    private watchPath: string;
    private s3Config: S3Config;
    private webhookUrl: string;

    constructor(
        fsal: IFS = new FSAL(),
        watchPath: string = path.join(process.cwd(), 'world-asset-injector'),
        s3Config: S3Config = { bucket: 'world-assets-prod', region: 'eu-central-1', endpoint: 's3.amazonaws.com' },
        webhookUrl: string = 'https://api.global-registry.internal/v1/assets/update-pointer'
    ) {
        super();
        this.fsal = fsal;
        this.watchPath = watchPath;
        this.s3Config = s3Config;
        this.webhookUrl = webhookUrl;
    }

    public async initialize(): Promise<void> {
        console.log(`[AssetWatcherCloud] Initializing watcher on: ${this.watchPath}`);
        this.fsal.watch(this.watchPath, { recursive: true }, async (event, filename) => {
            if (filename && filename.toLowerCase().endsWith('.glb')) {
                await this.processEvent(event, filename);
            }
        });
    }

    private async processEvent(event: string, filename: string): Promise<void> {
        const fullPath = path.join(this.watchPath, filename);
        
        if (!(await this.fsal.exists(fullPath))) {
            return;
        }

        try {
            const data = await this.fsal.readFile(fullPath);
            
            const isValid = await this.validateGLB(data);
            if (!isValid) {
                this.emit('validation_failed', { filename, reason: 'Invalid GLB magic number or corrupt header' });
                return;
            }

            const cloudUrl = await this.syncToS3(filename, data);
            await this.triggerUpdateWebhook(filename, cloudUrl);

            this.emit('sync_complete', { filename, url: cloudUrl });
        } catch (error) {
            this.emit('error', { filename, error: error instanceof Error ? error.message : String(error) });
        }
    }

    private async validateGLB(buffer: Buffer): Promise<boolean> {
        if (buffer.length < 12) return false;
        const magic = buffer.readUInt32LE(0);
        const version = buffer.readUInt32LE(4);
        // Magic 0x46546C67 = "glTF"
        return magic === 0x46546C67 && version === 2;
    }

    private async syncToS3(filename: string, content: Buffer): Promise<string> {
        // Mocking Cloud Storage Put Operation
        const s3Key = `assets/${filename}`;
        const destinationUrl = `https://${this.s3Config.bucket}.${this.s3Config.endpoint}/${s3Key}`;
        
        // In a real implementation: 
        // await s3Client.send(new PutObjectCommand({ Bucket: this.s3Config.bucket, Key: s3Key, Body: content }));
        
        console.log(`[AssetWatcherCloud] Uploaded ${filename} to ${destinationUrl}`);
        return destinationUrl;
    }

    private async triggerUpdateWebhook(filename: string, s3Url: string): Promise<void> {
        const assetId = path.basename(filename, '.glb');
        const payload = {
            id: assetId,
            source: 'world-asset-injector',
            remote_uri: s3Url,
            updated_at: new Date().toISOString()
        };

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Asset-Validator-Version': '1.0.0'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook notification failed with status: ${response.status}`);
        }

        console.log(`[AssetWatcherCloud] Global Database Pointer updated for ${assetId}`);
    }
}

// Instantiate and start
const watcher = new AssetWatcherCloud();
watcher.on('error', (err) => console.error('Watcher Error:', err));
watcher.on('sync_complete', (info) => console.log('Sync Success:', info));
watcher.initialize();