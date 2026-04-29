import { TraitResonanceEngine } from './TraitResonanceEngine';

export interface ChunkData {
    traits: string[];
    intensity: number;
}

export class AtmosphereMapper {
    private readonly engine: TraitResonanceEngine;
    private readonly size: number = 64;
    private readonly heatmap: number[][];

    constructor(engine: TraitResonanceEngine) {
        this.engine = engine;
        this.heatmap = new Array(this.size);
        for (let i = 0; i < this.size; i++) {
            this.heatmap[i] = new Array(this.size).fill(0);
        }
    }

    /**
     * Generiert eine Heatmap basierend auf der Trait-Resonanz der Chunks.
     * Optimiert für Performance durch Reduzierung von GC-Druck und Objekt-Allokationen.
     */
    public generateHeatmap(grid: ChunkData[][]): number[][] {
        let x: number = 0;
        let y: number = 0;
        let currentChunk: ChunkData;
        let currentRow: ChunkData[];
        let targetRow: number[];

        for (y = 0; y < this.size; y++) {
            currentRow = grid[y];
            targetRow = this.heatmap[y];
            
            for (x = 0; x < this.size; x++) {
                currentChunk = currentRow[x];
                
                // Berechnung der Resonanz über die Engine und Multiplikation mit der Intensität
                // Es wird angenommen, dass calculateResonance eine performante Methode ist.
                targetRow[x] = this.engine.calculateResonance(currentChunk.traits) * currentChunk.intensity;
            }
        }

        return this.heatmap;
    }
}