export type KappaPos = number;

export interface Vector2 {
    x: KappaPos;
    y: KappaPos;
}

export interface Vehicle {
    id: number;
    x: KappaPos;
    y: KappaPos;
    targetX: KappaPos;
    targetY: KappaPos;
    speed: number;
    isMoving: boolean;
}

export interface SimulationState {
    ticks: number;
    vehicles: Vehicle[];
}

export class SimEngine {
    private state: SimulationState;

    constructor(vehicles: Vehicle[]) {
        this.state = {
            ticks: 0,
            vehicles: vehicles.map(v => ({ ...v }))
        };
    }

    /**
     * Führt einen deterministischen Simulationsschritt aus.
     * Nutzt ausschließlich Integer-Arithmetik (KappaPos), um Plattform-übergreifende 
     * Konsistenz zu gewährleisten.
     */
    public step(): void {
        this.state.ticks++;

        for (let i = 0; i < this.state.vehicles.length; i++) {
            const v = this.state.vehicles[i];
            if (!v.isMoving) continue;

            const dx = v.targetX - v.x;
            const dy = v.targetY - v.y;

            if (dx === 0 && dy === 0) {
                v.isMoving = false;
                continue;
            }

            // Manhattan-Distanz als Basis für die Bewegung (deterministisch)
            const absDx = dx < 0 ? -dx : dx;
            const absDy = dy < 0 ? -dy : dy;
            const totalDist = absDx + absDy;

            if (totalDist <= v.speed) {
                v.x = v.targetX;
                v.y = v.targetY;
                v.isMoving = false;
            } else {
                // Skalierung der Bewegung mittels Integer-Division (Truncation)
                // Gewährleistet identische Ergebnisse auf allen JS-Engines
                const stepX = Math.trunc((dx * v.speed) / totalDist);
                const stepY = Math.trunc((dy * v.speed) / totalDist);

                v.x += stepX;
                v.y += stepY;

                // Korrektur bei Überschreitung des Ziels durch Rundungsfehler oder Richtungswechsel
                if (dx > 0 && v.x > v.targetX) v.x = v.targetX;
                else if (dx < 0 && v.x < v.targetX) v.x = v.targetX;

                if (dy > 0 && v.y > v.targetY) v.y = v.targetY;
                else if (dy < 0 && v.y < v.targetY) v.y = v.targetY;

                if (v.x === v.targetX && v.y === v.targetY) {
                    v.isMoving = false;
                }
            }
        }
    }

    public getState(): SimulationState {
        return {
            ticks: this.state.ticks,
            vehicles: this.state.vehicles.map(v => ({ ...v }))
        };
    }

    public setTarget(vehicleId: number, tx: KappaPos, ty: KappaPos): void {
        const v = this.state.vehicles.find(veh => veh.id === vehicleId);
        if (v) {
            v.targetX = tx;
            v.targetY = ty;
            v.isMoving = (v.x !== tx || v.y !== ty);
        }
    }

    public addVehicle(v: Vehicle): void {
        this.state.vehicles.push({ ...v });
    }
}