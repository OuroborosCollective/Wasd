export interface Position {
    x: number;
    y: number;
    z?: number;
}

export type TickCallback = (deltaTime: number, elapsed: number) => void;

/**
 * KappaPos - Zentrale Positionsklasse für das Ouroboros-Ökosystem.
 * Ermöglicht einheitliche Koordinatenmanipulation und Distanzberechnungen.
 */
export class KappaPos implements Position {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0
    ) {}

    public distanceTo(other: Position): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - (other.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    public add(other: Position): KappaPos {
        return new KappaPos(
            this.x + other.x,
            this.y + other.y,
            this.z + (other.z || 0)
        );
    }

    public lerp(other: Position, alpha: number): KappaPos {
        return new KappaPos(
            this.x + (other.x - this.x) * alpha,
            this.y + (other.y - this.y) * alpha,
            this.z + ((other.z || 0) - this.z) * alpha
        );
    }

    public clone(): KappaPos {
        return new KappaPos(this.x, this.y, this.z);
    }

    public static from(pos: Position): KappaPos {
        return new KappaPos(pos.x, pos.y, pos.z);
    }
}

/**
 * TickManager - Universeller Loop-Manager für zeitabhängige Logik.
 * Garantiert synchronisierte Updates über Modulgrenzen hinweg.
 */
export class TickManager {
    private subscribers: Set<TickCallback> = new Set();
    private lastTimestamp: number = 0;
    private elapsed: number = 0;
    private isActive: boolean = false;
    private requestId: number | null = null;

    constructor() {
        this.update = this.update.bind(this);
    }

    public subscribe(fn: TickCallback): void {
        this.subscribers.add(fn);
    }

    public unsubscribe(fn: TickCallback): void {
        this.subscribers.delete(fn);
    }

    public start(): void {
        if (this.isActive) return;
        this.isActive = true;
        this.lastTimestamp = performance.now();
        this.requestId = requestAnimationFrame(this.update);
    }

    public stop(): void {
        this.isActive = false;
        if (this.requestId !== null) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    private update(timestamp: number): void {
        if (!this.isActive) return;

        const deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.elapsed += deltaTime;
        this.lastTimestamp = timestamp;

        this.subscribers.forEach((callback) => {
            try {
                callback(deltaTime, this.elapsed);
            } catch (error) {
                console.error("Ouroboros Tick Error:", error);
            }
        });

        this.requestId = requestAnimationFrame(this.update);
    }

    public getElapsed(): number {
        return this.elapsed;
    }
}

// Globaler Singleton-Export für einfache Integration
export const globalTickManager = new TickManager();