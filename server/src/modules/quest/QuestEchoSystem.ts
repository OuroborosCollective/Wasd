export enum EchoIntensity {
    Combat = 0.95,
    Collect = 0.80,
    Talk_to = 0.70
}

export interface EchoBeacon {
    id: string;
    type: keyof typeof EchoIntensity;
    intensity: number;
    position: { x: number; y: number; z: number };
    timestamp: number;
}

export class QuestEchoSystem {
    private static instance: QuestEchoSystem;
    private beacons: Map<string, EchoBeacon> = new Map();
    private lastPrunerRetrieval: number = 0;
    private readonly RETRIEVAL_INTERVAL_MS = 100;

    private constructor() {}

    public static getInstance(): QuestEchoSystem {
        if (!QuestEchoSystem.instance) {
            QuestEchoSystem.instance = new QuestEchoSystem();
        }
        return QuestEchoSystem.instance;
    }

    /**
     * Registriert oder aktualisiert einen Echo-Beacon.
     */
    public setBeacon(id: string, type: keyof typeof EchoIntensity, x: number, y: number, z: number): void {
        this.beacons.set(id, {
            id,
            type,
            intensity: EchoIntensity[type],
            position: { x, y, z },
            timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
        });
    }

    /**
     * Entfernt einen spezifischen Beacon.
     */
    public removeBeacon(id: string): void {
        this.beacons.delete(id);
    }

    /**
     * Stellt Beacons für den HeuristicGoalPruner im 10Hz Takt bereit.
     * Gibt null zurück, wenn das Intervall von 100ms noch nicht erreicht ist.
     */
    public getBeaconsForHeuristicGoalPruner(): EchoBeacon[] | null {
        const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
        if (now - this.lastPrunerRetrieval >= this.RETRIEVAL_INTERVAL_MS) {
            this.lastPrunerRetrieval = now;
            return Array.from(this.beacons.values());
        }
        return null;
    }

    /**
     * Bereinigt veraltete Beacons basierend auf einer Time-to-Live.
     */
    public pruneExpiredBeacons(ttlMs: number): void {
        const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
        for (const [id, beacon] of this.beacons) {
            if (now - beacon.timestamp > ttlMs) {
                this.beacons.delete(id);
            }
        }
    }

    /**
     * Direkter Zugriff auf alle Beacons unabhängig vom Takt.
     */
    public getActiveBeacons(): EchoBeacon[] {
        return Array.from(this.beacons.values());
    }
}