import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

interface Beacon {
    id: string;
    lat: number;
    lng: number;
    type: string;
    data: any;
}

/**
 * SpatialHashService
 * Bietet O(1) Zugriff auf Beacons basierend auf geografischen Chunks.
 * Optimiert für minimale Latenz bei mobilen Abfragen.
 */
class SpatialHashService {
    private static instance: SpatialHashService;
    private grid: Map<string, Beacon[]> = new Map();
    private readonly PRECISION: number = 0.002; // Entspricht ca. 220m x 220m

    private constructor() {}

    public static getInstance(): SpatialHashService {
        if (!SpatialHashService.instance) {
            SpatialHashService.instance = new SpatialHashService();
        }
        return SpatialHashService.instance;
    }

    /**
     * Erzeugt einen eindeutigen Schlüssel für den aktuellen geografischen Chunk.
     */
    private getChunkKey(lat: number, lng: number): string {
        const latIndex = Math.floor(lat / this.PRECISION);
        const lngIndex = Math.floor(lng / this.PRECISION);
        return `${latIndex}|${lngIndex}`;
    }

    /**
     * Gibt alle Beacons im aktuellen Chunk zurück.
     */
    public getBeaconsInChunk(lat: number, lng: number): Beacon[] {
        const key = this.getChunkKey(lat, lng);
        return this.grid.get(key) || [];
    }

    /**
     * Registriert einen Beacon im Grid (für interne Updates).
     */
    public registerBeacon(beacon: Beacon): void {
        const key = this.getChunkKey(beacon.lat, beacon.lng);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push(beacon);
    }
}

/**
 * API-Endpoint Handler
 * Verarbeitet GET-Anfragen von mobilen Endgeräten mit lat/lng Parametern.
 */
const apiEndpoint = (req: IncomingMessage, res: ServerResponse): void => {
    try {
        const { query } = parse(req.url || '', true);
        const lat = parseFloat(query.lat as string);
        const lng = parseFloat(query.lng as string);

        if (isNaN(lat) || isNaN(lng)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid coordinates' }));
            return;
        }

        const spatialService = SpatialHashService.getInstance();
        const beacons = spatialService.getBeaconsInChunk(lat, lng);

        // Header für High-Performance und Mobile-Caching
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
            'Access-Control-Allow-Origin': '*',
            'X-Chunk-ID': `${Math.floor(lat / 0.002)}|${Math.floor(lng / 0.002)}`
        });

        res.end(JSON.stringify({
            status: 'success',
            timestamp: Date.now(),
            count: beacons.length,
            beacons: beacons
        }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
};

export default apiEndpoint;