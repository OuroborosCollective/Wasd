import { TraitResonanceEngine } from "./TraitResonanceEngine";

export interface TrafficEntity {
    x: number;
    y: number;
}

export class TrafficResonance extends TraitResonanceEngine {
    private readonly gridWidth: number = 64;
    private readonly gridHeight: number = 64;
    private readonly maxCapacity: number = 100;

    constructor() {
        super();
    }

    public update(entities: TrafficEntity[]): void {
        const chunkMap: Map<string, number> = new Map();

        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                chunkMap.set(`${x}:${y}`, 0);
            }
        }

        for (const entity of entities) {
            const cx = Math.floor(entity.x);
            const cy = Math.floor(entity.y);

            if (cx >= 0 && cx < this.gridWidth && cy >= 0 && cy < this.gridHeight) {
                const key = `${cx}:${cy}`;
                const currentCount = chunkMap.get(key) || 0;
                chunkMap.set(key, currentCount + 1);
            }
        }

        chunkMap.forEach((count, chunkKey) => {
            const density_avg = count / this.maxCapacity;
            this.broadcastChunkResonance(chunkKey, {
                flow_intensity: density_avg
            });
        });
    }
}