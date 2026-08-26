import { TraitResonanceEngine } from './TraitResonanceEngine';

export interface ChunkData {
    aggression_avg: number;
    faith_avg: number;
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
     * Generates a 64×64 heatmap from the canonical social-simulation chunk
     * aggregates. Faith provides the potential atmosphere; aggression damps it.
     */
    public generateHeatmap(grid: readonly (readonly ChunkData[])[]): number[][] {
        if (grid.length !== this.size || grid.some((row) => row.length !== this.size)) {
            throw new Error(`AtmosphereMapper expects a ${this.size}x${this.size} grid`);
        }

        for (let y = 0; y < this.size; y++) {
            const currentRow = grid[y]!;
            const targetRow = this.heatmap[y]!;
            for (let x = 0; x < this.size; x++) {
                const currentChunk = currentRow[x]!;
                targetRow[x] = this.engine.calculateResonance(
                    currentChunk.aggression_avg,
                    currentChunk.faith_avg,
                );
            }
        }

        return this.heatmap;
    }
}
