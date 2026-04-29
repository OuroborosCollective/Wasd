export type KappaIndex = bigint;

export class KappaPos {
    private static readonly GRID_SIZE: number = 1.0;
    private static readonly BIT_SHIFT: bigint = 32n;
    private static readonly MASK: bigint = 0xFFFFFFFFn;
    private static readonly OFFSET: bigint = 0x80000000n;

    public static worldToIndex(x: number, y: number): KappaIndex {
        const ix = BigInt(Math.floor(x / this.GRID_SIZE)) + this.OFFSET;
        const iy = BigInt(Math.floor(y / this.GRID_SIZE)) + this.OFFSET;
        return (ix << this.BIT_SHIFT) | (iy & this.MASK);
    }

    public static indexToWorld(index: KappaIndex): { x: number; y: number } {
        const ix = (index >> this.BIT_SHIFT) - this.OFFSET;
        const iy = (index & this.MASK) - this.OFFSET;
        return {
            x: Number(ix) * this.GRID_SIZE + (this.GRID_SIZE / 2),
            y: Number(iy) * this.GRID_SIZE + (this.GRID_SIZE / 2)
        };
    }

    public static getNeighbor(index: KappaIndex, dx: number, dy: number): KappaIndex {
        const ix = index >> this.BIT_SHIFT;
        const iy = index & this.MASK;
        return ((ix + BigInt(dx)) << this.BIT_SHIFT) | ((iy + BigInt(dy)) & this.MASK);
    }

    public static getDirectNeighbors(index: KappaIndex): KappaIndex[] {
        const ix = index >> this.BIT_SHIFT;
        const iy = index & this.MASK;
        return [
            ((ix) << this.BIT_SHIFT) | ((iy + 1n) & this.MASK),
            ((ix) << this.BIT_SHIFT) | ((iy - 1n) & this.MASK),
            ((ix + 1n) << this.BIT_SHIFT) | ((iy) & this.MASK),
            ((ix - 1n) << this.BIT_SHIFT) | ((iy) & this.MASK)
        ];
    }

    public static areNeighbors(a: KappaIndex, b: KappaIndex): boolean {
        const ax = a >> this.BIT_SHIFT;
        const ay = a & this.MASK;
        const bx = b >> this.BIT_SHIFT;
        const by = b & this.MASK;
        const dx = ax > bx ? ax - bx : bx - ax;
        const dy = ay > by ? ay - by : by - ay;
        return dx <= 1n && dy <= 1n && a !== b;
    }

    public static getDistanceSq(a: KappaIndex, b: KappaIndex): bigint {
        const ax = a >> this.BIT_SHIFT;
        const ay = a & this.MASK;
        const bx = b >> this.BIT_SHIFT;
        const by = b & this.MASK;
        const dx = ax - bx;
        const dy = ay - by;
        return dx * dx + dy * dy;
    }
}

export class KappaMap<T> {
    private data: Map<KappaIndex, T> = new Map();

    public set(index: KappaIndex, value: T): void {
        this.data.set(index, value);
    }

    public get(index: KappaIndex): T | undefined {
        return this.data.get(index);
    }

    public has(index: KappaIndex): boolean {
        return this.data.has(index);
    }

    public delete(index: KappaIndex): boolean {
        return this.data.delete(index);
    }

    public clear(): void {
        this.data.clear();
    }
}