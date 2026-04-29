export interface KappaPos {
    x: number;
    y: number;
    z: number;
}

export interface ChunkIndex {
    cx: number;
    cz: number;
}

/**
 * GeoSyncLayer
 * Zentrale Synchronisationsschicht zur Kartierung von kappaPos-Werten auf 64x64 Chunk-Indizes.
 * Der Skalierungsfaktor von 64 ist zwingend einzuhalten, um die Interoperabilität 
 * mit der Ads-API zu gewährleisten.
 */
export class GeoSyncLayer {
    /**
     * Skalierungsfaktor: Ein Chunk entspricht 64x64 Einheiten im kappaPos-System.
     */
    public static readonly CHUNK_SIZE: number = 64;

    /**
     * Mappt eine kappaPos auf die entsprechenden 64x64 Chunk-Indizes.
     * @param pos Die aktuelle Position im globalen Koordinatensystem.
     * @returns Die berechneten Chunk-Indizes (Integer).
     */
    public static mapToChunkIndex(pos: KappaPos): ChunkIndex {
        return {
            cx: Math.floor(pos.x / GeoSyncLayer.CHUNK_SIZE),
            cz: Math.floor(pos.z / GeoSyncLayer.CHUNK_SIZE)
        };
    }

    /**
     * Berechnet den Ursprungspunkt (Min-Ecke) eines Chunks in kappaPos-Koordinaten.
     * @param index Die Chunk-Indizes.
     * @returns Die kappaPos des Chunk-Ursprungs.
     */
    public static chunkToKappaPos(index: ChunkIndex): KappaPos {
        return {
            x: index.cx * GeoSyncLayer.CHUNK_SIZE,
            y: 0,
            z: index.cz * GeoSyncLayer.CHUNK_SIZE
        };
    }

    /**
     * Erzeugt einen konsistenten String-Identifier für einen Chunk zur Verwendung in der Ads-API.
     * @param pos Die kappaPos Koordinate.
     */
    public static getGlobalSyncKey(pos: KappaPos): string {
        const index = GeoSyncLayer.mapToChunkIndex(pos);
        return `chunk_${index.cx}_${index.cz}`;
    }

    /**
     * Prüft, ob sich eine Position innerhalb eines spezifischen Chunks befindet.
     */
    public static isWithinChunk(pos: KappaPos, index: ChunkIndex): boolean {
        const calculated = GeoSyncLayer.mapToChunkIndex(pos);
        return calculated.cx === index.cx && calculated.cz === index.cz;
    }
}