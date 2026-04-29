export class BeaconStore {
    private chunks: Map<string, {
        mask: BigUint64Array;
        data: Map<number, string>;
    }>;

    constructor() {
        this.chunks = new Map();
    }

    private getCoordinates(x: number, y: number): { cx: number; cy: number; lx: number; ly: number } {
        const cx = Math.floor(x / 64);
        const cy = Math.floor(y / 64);
        const lx = ((x % 64) + 64) % 64;
        const ly = ((y % 64) + 64) % 64;
        return { cx, cy, lx, ly };
    }

    private getChunkKey(cx: number, cy: number): string {
        return `${cx}:${cy}`;
    }

    public setLicense(x: number, y: number, license: string): void {
        const { cx, cy, lx, ly } = this.getCoordinates(x, y);
        const key = this.getChunkKey(cx, cy);

        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = {
                mask: new BigUint64Array(64),
                data: new Map()
            };
            this.chunks.set(key, chunk);
        }

        chunk.mask[ly] |= (1n << BigInt(lx));
        chunk.data.set((ly << 6) | lx, license);
    }

    public getLicense(x: number, y: number): string | null {
        const { cx, cy, lx, ly } = this.getCoordinates(x, y);
        const chunk = this.chunks.get(this.getChunkKey(cx, cy));

        if (!chunk) return null;

        const isSet = (chunk.mask[ly] & (1n << BigInt(lx))) !== 0n;
        if (!isSet) return null;

        return chunk.data.get((ly << 6) | lx) ?? null;
    }

    public hasLicense(x: number, y: number): boolean {
        const { cx, cy, lx, ly } = this.getCoordinates(x, y);
        const chunk = this.chunks.get(this.getChunkKey(cx, cy));
        if (!chunk) return false;
        return (chunk.mask[ly] & (1n << BigInt(lx))) !== 0n;
    }

    public removeLicense(x: number, y: number): void {
        const { cx, cy, lx, ly } = this.getCoordinates(x, y);
        const key = this.getChunkKey(cx, cy);
        const chunk = this.chunks.get(key);

        if (chunk) {
            chunk.mask[ly] &= ~(1n << BigInt(lx));
            chunk.data.delete((ly << 6) | lx);

            if (chunk.data.size === 0) {
                this.chunks.delete(key);
            }
        }
    }

    public getChunkMetrics(): { totalChunks: number; totalLicenses: number } {
        let totalLicenses = 0;
        for (const chunk of this.chunks.values()) {
            totalLicenses += chunk.data.size;
        }
        return {
            totalChunks: this.chunks.size,
            totalLicenses
        };
    }
}