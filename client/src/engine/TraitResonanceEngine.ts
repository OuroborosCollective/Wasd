export interface ResonanceEntity {
    x: number;
    y: number;
    traits: {
        aggression: number;
        [key: string]: number;
    };
}

export class TraitResonanceEngine {
    private entities: ResonanceEntity[] = [];
    private readonly CHUNK_SIZE: number = 64;

    /**
     * Aktualisiert die Liste der Entitäten im aktiven Chunk.
     * @param entities Liste der Entitäten mit ihren Positionen und Traits.
     */
    public setEntities(entities: ResonanceEntity[]): void {
        this.entities = entities;
    }

    /**
     * Erzeugt eine 64x64 Matrix, die die Aggressions-Intensitäten im Chunk darstellt.
     * @returns number[][] 64x64 Matrix mit Aggressionswerten.
     */
    public getCurrentChunkData(): number[][] {
        const matrix: number[][] = Array.from({ length: this.CHUNK_SIZE }, () =>
            new Array(this.CHUNK_SIZE).fill(0)
        );

        for (const entity of this.entities) {
            const x = Math.floor(entity.x);
            const y = Math.floor(entity.y);

            if (this.isWithinBounds(x, y)) {
                const intensity = entity.traits?.aggression || 0;
                matrix[y][x] += intensity;
            }
        }

        return matrix;
    }

    /**
     * Überprüft, ob die Koordinaten innerhalb der Chunk-Grenzen liegen.
     */
    private isWithinBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.CHUNK_SIZE && y >= 0 && y < this.CHUNK_SIZE;
    }
}