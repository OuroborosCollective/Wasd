import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/**
 * SyncSystem handles spatial-based network synchronization using a Grid-based Interest Management approach.
 * It tracks entity positions and manages Redis channel subscriptions to optimize bandwidth.
 */
export interface SyncUpdate {
    id: string;
    position: { x: number; y: number; z: number };
    timestamp: number;
    metadata?: any;
}

export interface RedisTransport {
    subscribe: (channels: string[]) => Promise<void>;
    unsubscribe: (channels: string[]) => Promise<void>;
    publish: (channel: string, message: string) => Promise<void>;
}

// @ARE-GUARD-EXEMPT: SyncSystem timestamp only; not world-state input.
export class SyncSystem {
    private entityCellMap: Map<string, string> = new Map();
    private readonly cellSize: number;
    private readonly interestRadius: number;

    constructor(cellSize: number = 50, interestRadius: number = 1) {
        this.cellSize = cellSize;
        this.interestRadius = interestRadius;
    }

    /**
     * Calculates the grid cell key for a given 3D position.
     */
    public getCellKey(position: Vector3): string {
        const x = Math.floor(position.x / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `grid:cell:${x}:${z}`;
    }

    /**
     * Returns an array of cell keys within the interest radius of a central cell.
     */
    public getInterestArea(cellKey: string): string[] {
        const parts = cellKey.split(':');
        const cx = parseInt(parts[2]);
        const cz = parseInt(parts[3]);
        const area: string[] = [];

        for (let x = -this.interestRadius; x <= this.interestRadius; x++) {
            for (let z = -this.interestRadius; z <= this.interestRadius; z++) {
                area.push(`grid:cell:${cx + x}:${cz + z}`);
            }
        }
        return area;
    }

    /**
     * Synchronizes an entity's position and updates interest management subscriptions if the cell changes.
     * @param entityId Unique identifier for the player or object
     * @param position Current Babylon.js Vector3 position
     * @param transport The Redis transport layer implementation
     */
    public async syncEntity(
        entityId: string,
        position: Vector3,
        transport: RedisTransport
    ): Promise<void> {
        const currentCell = this.getCellKey(position);
        const lastCell = this.entityCellMap.get(entityId);

        // 1. Create update payload
        const update: SyncUpdate = {
            id: entityId,
            position: { x: position.x, y: position.y, z: position.z },
            timestamp: Date.now()
        };

        // 2. Broadcast position to current cell channel
        await transport.publish(currentCell, JSON.stringify(update));

        // 3. Handle Cell Transition (Interest Management)
        if (currentCell !== lastCell) {
            const newInterestSet = new Set(this.getInterestArea(currentCell));
            const oldInterestSet = lastCell ? new Set(this.getInterestArea(lastCell)) : new Set<string>();

            // Calculate differences for optimized sub/unsub
            const toSubscribe = Array.from(newInterestSet).filter(cell => !oldInterestSet.has(cell));
            const toUnsubscribe = Array.from(oldInterestSet).filter(cell => !newInterestSet.has(cell));

            if (toSubscribe.length > 0) {
                await transport.subscribe(toSubscribe);
            }

            if (toUnsubscribe.length > 0) {
                await transport.unsubscribe(toUnsubscribe);
            }

            // Update local state
            this.entityCellMap.set(entityId, currentCell);
        }
    }

    /**
     * Cleans up tracking data when an entity leaves the system.
     */
    public async removeEntity(entityId: string, transport: RedisTransport): Promise<void> {
        const lastCell = this.entityCellMap.get(entityId);
        if (lastCell) {
            const interestArea = this.getInterestArea(lastCell);
            await transport.unsubscribe(interestArea);
            this.entityCellMap.delete(entityId);
        }
    }

    /**
     * Helper to get all entities currently tracked in a specific cell.
     * This can be used for server-side logic like physics or area-of-effect calculations.
     */
    public getEntitiesInCell(cellKey: string): string[] {
        const entities: string[] = [];
        this.entityCellMap.forEach((cell, id) => {
            if (cell === cellKey) entities.push(id);
        });
        return entities;
    }
}