export class SpatialHashService {
    private readonly precision: number;

    constructor(precision: number = 1000000) {
        this.precision = precision;
    }

    /**
     * Berechnet den räumlichen Hash basierend auf der 64x64 Chunk-Logik.
     * Komplexität: O(1)
     */
    public calculateHash(lat: number, lon: number): number {
        const pLat = Math.floor(lat * this.precision);
        const pLon = Math.floor(lon * this.precision);
        return ((pLat >> 6) << 16 | (pLon >> 6));
    }

    /**
     * Gibt alle relevanten Hash-Indizes für eine Umkreissuche zurück.
     */
    public getNearbyHashes(lat: number, lon: number, range: number = 1): number[] {
        const hashes: number[] = [];
        const latBase = Math.floor(lat * this.precision) >> 6;
        const lonBase = Math.floor(lon * this.precision) >> 6;

        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                hashes.push(((latBase + i) << 16) | (lonBase + j));
            }
        }
        return hashes;
    }

    /**
     * Hilfsmethode zur Validierung der Chunk-Zugehörigkeit.
     */
    public isSameChunk(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
        return this.calculateHash(lat1, lon1) === this.calculateHash(lat2, lon2);
    }
}