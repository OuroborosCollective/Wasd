export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export class SpatialGrid<T = string> {
    private cellSize: number;
    private cells: Map<string, Set<T>>;

    constructor(cellSize: number = 10) {
        this.cellSize = cellSize;
        this.cells = new Map<string, Set<T>>();
    }

    private getCellKey(pos: Vector3): string {
        const gx = Math.floor(pos.x / this.cellSize);
        const gy = Math.floor(pos.y / this.cellSize);
        const gz = Math.floor(pos.z / this.cellSize);
        return `${gx},${gy},${gz}`;
    }

    private getCellKeyFromCoords(x: number, y: number, z: number): string {
        return `${x},${y},${z}`;
    }

    public insert(id: T, position: Vector3): void {
        const key = this.getCellKey(position);
        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(id);
    }

    public remove(id: T, position: Vector3): boolean {
        const key = this.getCellKey(position);
        const cell = this.cells.get(key);
        if (cell) {
            const removed = cell.delete(id);
            if (cell.size === 0) {
                this.cells.delete(key);
            }
            return removed;
        }
        return false;
    }

    public update(id: T, oldPosition: Vector3, newPosition: Vector3): void {
        const oldKey = this.getCellKey(oldPosition);
        const newKey = this.getCellKey(newPosition);

        if (oldKey !== newKey) {
            this.remove(id, oldPosition);
            this.insert(id, newPosition);
        }
    }

    public getNearby(position: Vector3, radius: number): T[] {
        const results: T[] = [];
        const minX = Math.floor((position.x - radius) / this.cellSize);
        const maxX = Math.floor((position.x + radius) / this.cellSize);
        const minY = Math.floor((position.y - radius) / this.cellSize);
        const maxY = Math.floor((position.y + radius) / this.cellSize);
        const minZ = Math.floor((position.z - radius) / this.cellSize);
        const maxZ = Math.floor((position.z + radius) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const key = this.getCellKeyFromCoords(x, y, z);
                    const cell = this.cells.get(key);
                    if (cell) {
                        for (const id of cell) {
                            results.push(id);
                        }
                    }
                }
            }
        }
        return results;
    }

    public getNearby2D(position: Vector3, radius: number): T[] {
        const results: T[] = [];
        const minX = Math.floor((position.x - radius) / this.cellSize);
        const maxX = Math.floor((position.x + radius) / this.cellSize);
        const minZ = Math.floor((position.z - radius) / this.cellSize);
        const maxZ = Math.floor((position.z + radius) / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                const key = this.getCellKeyFromCoords(x, y, z);
                const cell = this.cells.get(key);
                if (cell) {
                    for (const id of cell) {
                        results.push(id);
                    }
                }
            }
        }
        return results;
    }

    public clear(): void {
        this.cells.clear();
    }
}