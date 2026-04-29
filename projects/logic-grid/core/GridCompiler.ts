export interface AREState {
    amplitude: number;
    resonance: number;
    phaseShift: number;
}

export class GridCompiler {
    private readBuffer: Map<string, AREState> = new Map();
    private writeBuffer: Map<string, AREState> = new Map();
    private tick: number = 0;

    constructor() {}

    public addCell(kappaPos: string, state: AREState): void {
        this.readBuffer.set(kappaPos, { ...state });
        this.writeBuffer.set(kappaPos, { ...state });
    }

    public getCell(kappaPos: string): AREState | undefined {
        return this.readBuffer.get(kappaPos);
    }

    public computeNextStep(): void {
        this.tick++;

        for (const [kappaPos, state] of this.readBuffer.entries()) {
            // O(1) Neighbor lookup example for interference logic
            // const neighbors = this.getNeighbors(kappaPos);
            
            // Berechnung der neuen Amplitude basierend auf der Resonanz-Formel
            const newAmplitude = Math.sin(state.resonance * this.tick + state.phaseShift);

            // Update Write-Buffer
            const nextState = this.writeBuffer.get(kappaPos);
            if (nextState) {
                nextState.amplitude = newAmplitude;
                // Hier könnten Interferenz-Einflüsse der Nachbarn aus dem readBuffer addiert werden
            }
        }

        this.syncBuffers();
    }

    private getNeighbors(kappaPos: string): AREState[] {
        const coords = kappaPos.split(',').map(Number);
        const neighbors: AREState[] = [];
        
        // 3D Grid Offsets
        const offsets = [
            [-1, 0, 0], [1, 0, 0],
            [0, -1, 0], [0, 1, 0],
            [0, 0, -1], [0, 0, 1]
        ];

        for (const [dx, dy, dz] of offsets) {
            const nx = coords[0] + dx;
            const ny = coords[1] + dy;
            const nz = coords[2] + dz;
            const neighborKey = `${nx},${ny},${nz}`;
            
            const neighborState = this.readBuffer.get(neighborKey);
            if (neighborState) {
                neighbors.push(neighborState);
            }
        }
        return neighbors;
    }

    private syncBuffers(): void {
        // Übertragung der berechneten Zustände in den Read-Buffer für den nächsten Tick
        for (const [kappaPos, state] of this.writeBuffer.entries()) {
            const readState = this.readBuffer.get(kappaPos);
            if (readState) {
                readState.amplitude = state.amplitude;
                readState.resonance = state.resonance;
                readState.phaseShift = state.phaseShift;
            }
        }
    }

    public getTick(): number {
        return this.tick;
    }

    public getAllCells(): Map<string, AREState> {
        return this.readBuffer;
    }
}