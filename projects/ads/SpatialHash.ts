/**
 * SpatialHash.ts - Geo-Fencing API (Hyperlocal Beacons)
 * 
 * B2B advertising beacons using 64x64 chunk logic from Areloria engine.
 * O(1) spatial hash based on kappaPos integers.
 * No floating-point GPS rounding errors.
 * 
 * Features:
 * - kappaPos integer coordinates
 * - O(1) beacon queries
 * - Resonance triggers
 * - No floating-point drift
 */

import { EventEmitter } from 'events';

/** kappaPos - Integer coordinates (1 unit = 1 meter) */
export interface KappaPos {
    x: number; // Integer x coordinate
    y: number; // Integer y coordinate
}

/** Beacon types */
export enum BeaconType {
    Promotion = 'promotion',
    Loyalty = 'loyalty',
    Informational = 'informational',
    Social = 'social'
}

/** Advertising beacon */
export interface Beacon {
    id: string;
    position: KappaPos;
    type: BeaconType;
    resonance: number;
    radius: number;
    content: string;
    active: boolean;
    createdAt: number;
}

/** Device check result */
export interface TriggerResult {
    triggered: boolean;
    beaconId: string;
    resonance: number;
    distance: number;
}

/** Chunk size (64x64) */
const CHUNK_SIZE = 64;

/** Grid dimensions */
const GRID_WIDTH = 4096;
const GRID_HEIGHT = 4096;

/**
 * Convert lat/lng to kappaPos - deterministic.
 */
export function geoToKappaPos(lat: number, lng: number): KappaPos {
    // Scale: 1 degree ≈ 111320 meters at equator
    // kappaPos units = 1 meter
    const x = ((lng + 180) * 111320) | 0;
    const y = ((lat + 90) * 111320) | 0;
    return { x, y };
}

/**
 * Convert kappaPos to chunk coordinates.
 */
export function kappaPosToChunk(pos: KappaPos): { cx: number; cy: number } {
    return {
        cx: (pos.x / CHUNK_SIZE) | 0,
        cy: (pos.y / CHUNK_SIZE) | 0
    };
}

/**
 * Spatial Hash - O(1) beacon storage.
 */
export class SpatialHash {
    private beacons: Map<string, Beacon> = new Map();
    private chunks: Map<string, Set<string>> = new Map();

    /**
     * Add beacon - O(1).
     */
    public addBeacon(beacon: Beacon): void {
        this.beacons.set(beacon.id, beacon);
        
        const chunkKey = this.getChunkKey(beacon.position);
        if (!this.chunks.has(chunkKey)) {
            this.chunks.set(chunkKey, new Set());
        }
        this.chunks.get(chunkKey)!.add(beacon.id);
    }

    /**
     * Remove beacon - O(1).
     */
    public removeBeacon(beaconId: string): boolean {
        const beacon = this.beacons.get(beaconId);
        if (!beacon) return false;
        
        const chunkKey = this.getChunkKey(beacon.position);
        this.chunks.get(chunkKey)?.delete(beaconId);
        this.beacons.delete(beaconId);
        return true;
    }

    /**
     * Get beacon - O(1).
     */
    public getBeacon(beaconId: string): Beacon | undefined {
        return this.beacons.get(beaconId);
    }

    /**
     * Query beacons in chunk - O(1).
     */
    public queryChunk(chunkX: number, chunkY: number): Beacon[] {
        const key = `${chunkX}:${chunkY}`;
        const beaconIds = this.chunks.get(key);
        if (!beaconIds) return [];
        
        return Array.from(beaconIds)
            .map(id => this.beacons.get(id))
            .filter(b => b && b.active) as Beacon[];
    }

    /**
     * Query nearby beacons - O(n) where n = local beacons.
     */
    public queryNearby(pos: KappaPos, radius: number): Beacon[] {
        const { cx, cy } = kappaPosToChunk(pos);
        const nearby: Beacon[] = [];
        
        // Check surrounding chunks (3x3)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const beacons = this.queryChunk(cx + dx, cy + dy);
                for (const beacon of beacons) {
                    if (this.isInRadius(pos, beacon.position, radius)) {
                        nearby.push(beacon);
                    }
                }
            }
        }
        
        return nearby;
    }

    /**
     * Check if position is in radius - deterministic integer math.
     */
    public isInRadius(pos: KappaPos, beaconPos: KappaPos, radius: number): boolean {
        const dx = pos.x - beaconPos.x;
        const dy = pos.y - beaconPos.y;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    /**
     * Check device trigger - O(n) local query.
     */
    public checkTrigger(devicePos: KappaPos): TriggerResult | null {
        const nearby = this.queryNearby(devicePos, 50); // 50m default radius
        
        let closest: TriggerResult | null = null;
        
        for (const beacon of nearby) {
            const dx = devicePos.x - beacon.position.x;
            const dy = devicePos.y - beacon.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy) | 0;
            
            if (distance <= beacon.radius) {
                const result: TriggerResult = {
                    triggered: true,
                    beaconId: beacon.id,
                    resonance: beacon.resonance,
                    distance
                };
                
                if (!closest || beacon.resonance > closest.resonance) {
                    closest = result;
                }
            }
        }
        
        return closest;
    }

    /**
     * Get chunk key - O(1).
     */
    private getChunkKey(pos: KappaPos): string {
        const { cx, cy } = kappaPosToChunk(pos);
        return `${cx}:${cy}`;
    }

    /**
     * Get all active beacons.
     */
    public getAllBeacons(): Beacon[] {
        return Array.from(this.beacons.values()).filter(b => b.active);
    }

    /**
     * Clear all beacons.
     */
    public clear(): void {
        this.beacons.clear();
        this.chunks.clear();
    }

    /**
     * Get beacon count.
     */
    public getCount(): number {
        return this.beacons.size;
    }
}

/**
 * Beacon Manager - API layer.
 */
export class BeaconManager extends EventEmitter {
    private spatialHash: SpatialHash;

    constructor() {
        super();
        this.spatialHash = new SpatialHash();
    }

    /**
     * Create beacon.
     */
    public createBeacon(params: {
        id: string;
        lat: number;
        lng: number;
        type: BeaconType;
        resonance: number;
        radius: number;
        content: string;
    }): Beacon {
        const position = geoToKappaPos(params.lat, params.lng);
        const beacon: Beacon = {
            id: params.id,
            position,
            type: params.type,
            resonance: params.resonance,
            radius: params.radius,
            content: params.content,
            active: true,
            createdAt: Date.now()
        };
        
        this.spatialHash.addBeacon(beacon);
        this.emit('beacon_created', beacon);
        
        return beacon;
    }

    /**
     * Check if device triggers beacon.
     */
    public checkDeviceTrigger(lat: number, lng: number): TriggerResult | null {
        const position = geoToKappaPos(lat, lng);
        return this.spatialHash.checkTrigger(position);
    }

    /**
     * Get nearby beacons.
     */
    public getNearbyBeacons(lat: number, lng: number, radius: number = 50): Beacon[] {
        const position = geoToKappaPos(lat, lng);
        return this.spatialHash.queryNearby(position, radius);
    }

    /**
     * Deactivate beacon.
     */
    public deactivateBeacon(beaconId: string): boolean {
        const beacon = this.spatialHash.getBeacon(beaconId);
        if (!beacon) return false;
        
        beacon.active = false;
        this.emit('beacon_deactivated', beacon);
        return true;
    }

    /**
     * Get beacon.
     */
    public getBeacon(beaconId: string): Beacon | undefined {
        return this.spatialHash.getBeacon(beaconId);
    }
}

export default SpatialHash;
export { BeaconManager, BeaconType };
export { geoToKappaPos, kappaPosToChunk };
export { CHUNK_SIZE, GRID_WIDTH, GRID_HEIGHT };