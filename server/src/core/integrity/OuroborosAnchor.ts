import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as path from 'path';
import { deterministicNow } from '../determinism/AREDeterminism.js';

export interface StateManifest {
    nodeModulesHash: string;
    engineTick: number;
    timestamp: number;
    checksum: string;
}

export class OuroborosAnchor {
    private readonly manifestPath: string;
    private readonly nodeModulesPath: string;
    private readonly lockFilePath: string;

    constructor(rootPath: string = process.cwd()) {
        this.manifestPath = path.join(rootPath, '.ouroboros', 'manifest.json');
        this.nodeModulesPath = path.join(rootPath, 'node_modules');
        this.lockFilePath = path.join(rootPath, 'package-lock.json');
    }

    /**
     * Validiert die Integrität der node_modules gegen den letzten aufgezeichneten Tick
     */
    public async validateBootIntegrity(): Promise<boolean> {
        try {
            const currentHash = await this.computeNodeModulesHash();
            const manifest = await this.getLastStateManifest();

            if (!manifest) {
                console.info('[OuroborosAnchor] No integrity manifest found. Initializing anchor point...');
                await this.updateAnchor(currentHash, 0);
                return true;
            }

            if (currentHash !== manifest.nodeModulesHash) {
                console.error('[OuroborosAnchor] CRITICAL: node_modules integrity mismatch detected.');
                console.error(`[OuroborosAnchor] Expected: ${manifest.nodeModulesHash}`);
                console.error(`[OuroborosAnchor] Actual:   ${currentHash}`);
                return false;
            }

            console.log(`[OuroborosAnchor] Integrity verified for Tick #${manifest.engineTick}`);
            return true;
        } catch (error) {
            console.error('[OuroborosAnchor] Boot validation failed with error:', error);
            return false;
        }
    }

    /**
     * Erzeugt einen kryptographischen Hash über die Abhängigkeitsstruktur
     * Verwendet package-lock.json für Performance und deterministische Auflösung
     */
    private async computeNodeModulesHash(): Promise<string> {
        try {
            const lockFileBuffer = await fs.readFile(this.lockFilePath);
            const hash = crypto.createHash('sha256');
            
            // Wir kombinieren den Inhalt der package-lock mit Metadaten des node_modules Ordners
            const stats = await fs.stat(this.nodeModulesPath);
            
            hash.update(lockFileBuffer);
            hash.update(stats.mtimeMs.toString());
            
            return hash.digest('hex');
        } catch (error: any) {
            throw new Error(`Failed to compute node_modules hash: ${error.message}`);
        }
    }

    /**
     * Lädt das Global State Manifest des letzten Ticks
     */
    private async getLastStateManifest(): Promise<StateManifest | null> {
        try {
            const data = await fs.readFile(this.manifestPath, 'utf8');
            const manifest: StateManifest = JSON.parse(data);
            
            // Verifiziere Manifest-Checksum gegen Manipulation
            const validationHash = this.generateManifestChecksum(manifest);
            if (validationHash !== manifest.checksum) {
                throw new Error('Manifest checksum corruption detected');
            }
            
            return manifest;
        } catch (e) {
            return null;
        }
    }

    /**
     * Aktualisiert den Anchor nach einem erfolgreichen Engine-Tick
     */
    public async updateAnchor(hash: string, tick: number): Promise<void> {
        const manifestDir = path.dirname(this.manifestPath);
        
        await fs.mkdir(manifestDir, { recursive: true });

        const manifest: Partial<StateManifest> = {
            nodeModulesHash: hash,
            engineTick: tick,
            timestamp: deterministicNow(tick)
        };

        (manifest as StateManifest).checksum = this.generateManifestChecksum(manifest as StateManifest);

        await fs.writeFile(
            this.manifestPath, 
            JSON.stringify(manifest, null, 2), 
            'utf8'
        );
    }

    private generateManifestChecksum(manifest: Partial<StateManifest>): string {
        const payload = `${manifest.nodeModulesHash}|${manifest.engineTick}|${manifest.timestamp}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
}
