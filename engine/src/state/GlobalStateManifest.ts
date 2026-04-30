export interface ICryptoDependencyHeader {
    /**
     * Eindeutiger Index des Ticks im 10-Hz Takt (alle 100ms)
     */
    readonly tickSequence: number;

    /**
     * Hochpräziser Server-Zeitstempel zur Validierung der Latenz
     */
    readonly serverTimestamp: number;

    /**
     * SHA-256 Hash des aktuellen Gesamtzustands
     */
    readonly stateHash: string;

    /**
     * Kryptographische Signatur (HMAC/RSA), die die Server-Autorität beglaubigt
     */
    readonly authoritySignature: string;

    /**
     * Verkettung zum vorherigen State-Hash (Blockchain-Prinzip)
     */
    readonly previousStateHash: string;

    /**
     * Nonce zur Vermeidung von Replay-Attacks innerhalb desselben Ticks
     */
    readonly integrityNonce: number;
}

export interface IManifestDependency {
    /**
     * ID des Sub-Systems oder der Entity-Gruppe
     */
    readonly componentId: string;

    /**
     * Lokaler Hash-Wert des Sub-Systems zur Integritätsprüfung
     */
    readonly checksum: string;

    /**
     * Versions-Flag für Schema-Kompatibilität
     */
    readonly schemaVersion: number;
}

/**
 * GlobalStateManifest stellt die absolute Wahrheit des Server-Zustands dar.
 * Die Struktur erzwingt eine strikte zeitliche Abfolge durch kryptographische Verkettung.
 */
export class GlobalStateManifest {
    public static readonly TICK_RATE_HZ = 10;
    public static readonly TICK_INTERVAL_MS = 1000 / GlobalStateManifest.TICK_RATE_HZ;

    public readonly header: ICryptoDependencyHeader;
    public readonly dependencies: IManifestDependency[];
    public readonly payload: Record<string, any>;

    constructor(
        tickSequence: number,
        stateHash: string,
        authoritySignature: string,
        previousStateHash: string,
        integrityNonce: number,
        dependencies: IManifestDependency[] = [],
        payload: Record<string, any> = {}
    ) {
        this.header = {
            tickSequence,
            serverTimestamp: Date.now(),
            stateHash,
            authoritySignature,
            previousStateHash,
            integrityNonce
        };
        this.dependencies = dependencies;
        this.payload = payload;
    }

    /**
     * Erzeugt einen binären Snapshot des Manifests für die Netzwerkübertragung
     */
    public serialize(): Uint8Array {
        const jsonString = JSON.stringify({
            h: this.header,
            d: this.dependencies,
            p: this.payload
        });
        return new TextEncoder().encode(jsonString);
    }

    /**
     * Validiert die Sequenzielle Integrität gegenüber einem vorherigen Manifest
     */
    public validateSequence(previousManifest: GlobalStateManifest): boolean {
        if (this.header.tickSequence !== previousManifest.header.tickSequence + 1) {
            return false;
        }
        if (this.header.previousStateHash !== previousManifest.header.stateHash) {
            return false;
        }
        return true;
    }

    /**
     * Prüft, ob der Zeitstempel innerhalb des 100ms Fensters liegt (Toleranz eingerechnet)
     */
    public isWithinTimingWindow(currentServerTime: number, toleranceMs: number = 50): boolean {
        const drift = Math.abs(currentServerTime - this.header.serverTimestamp);
        return drift <= GlobalStateManifest.TICK_INTERVAL_MS + toleranceMs;
    }
}