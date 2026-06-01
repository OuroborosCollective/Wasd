import Redis, { RedisOptions } from 'ioredis';

export interface GridPosition {
    x: number;
    y: number;
}

// @ARE-GUARD-EXEMPT: Redis orchestration telemetry only; timestamps are not world-state inputs.
export class RedisOrchestrator {
    private readonly pub: Redis;
    private readonly sub: Redis;
    private readonly cellHandlers: Map<string, Set<(data: any) => void>> = new Map();

    constructor(options: RedisOptions) {
        this.pub = new Redis(options);
        this.sub = new Redis(options);

        this.initSubscriptionHandler();
    }

    private initSubscriptionHandler(): void {
        this.sub.on('message', (channel: string, message: string) => {
            if (channel.startsWith('world:cell:')) {
                const handlers = this.cellHandlers.get(channel);
                if (handlers && handlers.size > 0) {
                    try {
                        const data = JSON.parse(message);
                        handlers.forEach(handler => handler(data));
                    } catch (err) {
                        console.error(`Failed to parse redis message from channel ${channel}:`, err);
                    }
                }
            }
        });
    }

    private getCellChannel(x: number, y: number): string {
        return `world:cell:${Math.floor(x)}:${Math.floor(y)}`;
    }

    /**
     * Publiziert eine Nachricht an eine spezifische Grid-Zelle.
     */
    public async publishToCell(x: number, y: number, data: any): Promise<void> {
        const channel = this.getCellChannel(x, y);
        const payload = JSON.stringify({
            ...data,
            _timestamp: Date.now(),
            _cell: { x, y }
        });
        await this.pub.publish(channel, payload);
    }

    /**
     * Registriert einen Handler für eine spezifische Zelle.
     */
    public async subscribeToCell(x: number, y: number, handler: (data: any) => void): Promise<void> {
        const channel = this.getCellChannel(x, y);
        
        if (!this.cellHandlers.has(channel)) {
            this.cellHandlers.set(channel, new Set());
            await this.sub.subscribe(channel);
        }
        
        this.cellHandlers.get(channel)!.add(handler);
    }

    /**
     * Entfernt einen Handler oder die gesamte Subscription für eine Zelle.
     */
    public async unsubscribeFromCell(x: number, y: number, handler?: (data: any) => void): Promise<void> {
        const channel = this.getCellChannel(x, y);
        const handlers = this.cellHandlers.get(channel);

        if (!handlers) return;

        if (handler) {
            handlers.delete(handler);
        } else {
            handlers.clear();
        }

        if (handlers.size === 0) {
            await this.sub.unsubscribe(channel);
            this.cellHandlers.delete(channel);
        }
    }

    /**
     * Berechnet die Differenz der Subskriptionen basierend auf der AOI (Area of Interest).
     * Abonniert neue Zellen und kündigt Abos für Zellen, die außerhalb des Radius liegen.
     */
    public async updatePlayerAoI(
        playerId: string,
        oldPos: GridPosition | null,
        newPos: GridPosition,
        radius: number,
        onMessage: (data: any) => void
    ): Promise<void> {
        const getCellsInRange = (pos: GridPosition, r: number): Set<string> => {
            const cells = new Set<string>();
            const startX = Math.floor(pos.x) - r;
            const endX = Math.floor(pos.x) + r;
            const startY = Math.floor(pos.y) - r;
            const endY = Math.floor(pos.y) + r;

            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    cells.add(`${x}:${y}`);
                }
            }
            return cells;
        };

        const currentCells = getCellsInRange(newPos, radius);
        const previousCells = oldPos ? getCellsInRange(oldPos, radius) : new Set<string>();

        // Neue Zellen abonnieren
        const subscribePromises: Promise<void>[] = [];
        for (const cellKey of currentCells) {
            if (!previousCells.has(cellKey)) {
                const [x, y] = cellKey.split(':').map(Number);
                subscribePromises.push(this.subscribeToCell(x, y, onMessage));
            }
        }

        // Alte Zellen deabonnieren
        const unsubscribePromises: Promise<void>[] = [];
        for (const cellKey of previousCells) {
            if (!currentCells.has(cellKey)) {
                const [x, y] = cellKey.split(':').map(Number);
                unsubscribePromises.push(this.unsubscribeFromCell(x, y, onMessage));
            }
        }

        await Promise.all([...subscribePromises, ...unsubscribePromises]);
    }

    /**
     * Schließt die Verbindungen zu Redis.
     */
    public async shutdown(): Promise<void> {
        this.cellHandlers.clear();
        await Promise.all([
            this.pub.quit(),
            this.sub.quit()
        ]);
    }
}