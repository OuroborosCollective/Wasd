export class AtomModel {
    public mass: number;
    public velocity: number;
    public kappaPos: number;

    private minKappa: number;
    private maxKappa: number;

    constructor(
        mass: number,
        velocity: number,
        kappaPos: number,
        minKappa: number = 0,
        maxKappa: number = 1000
    ) {
        this.mass = mass;
        this.velocity = velocity;
        this.kappaPos = Math.floor(kappaPos);
        this.minKappa = minKappa;
        this.maxKappa = maxKappa;
        this.validateBoundaries();
    }

    /**
     * Stellt sicher, dass kappaPos innerhalb der definierten Grenzen liegt.
     */
    public validateBoundaries(): void {
        if (this.kappaPos < this.minKappa) {
            this.kappaPos = this.minKappa;
        } else if (this.kappaPos > this.maxKappa) {
            this.kappaPos = this.maxKappa;
        }
    }

    /**
     * Berechnet die nächste Position basierend auf der Zeitdifferenz.
     * Kehrt die Geschwindigkeit um, falls eine Grenze erreicht wird.
     * @param deltaTime Zeitinkrement für die Simulation
     */
    public update(deltaTime: number): void {
        const movement = this.velocity * deltaTime;
        const nextPos = this.kappaPos + movement;

        if (nextPos <= this.minKappa) {
            this.kappaPos = this.minKappa;
            this.velocity = Math.abs(this.velocity);
        } else if (nextPos >= this.maxKappa) {
            this.kappaPos = this.maxKappa;
            this.velocity = -Math.abs(this.velocity);
        } else {
            this.kappaPos = Math.floor(nextPos);
        }
    }

    /**
     * Setzt die Kappa-Position manuell unter Einhaltung der Validierung.
     */
    public setKappaPos(pos: number): void {
        this.kappaPos = Math.floor(pos);
        this.validateBoundaries();
    }

    /**
     * Definiert den gültigen Kappa-Bereich neu.
     */
    public setConstraints(min: number, max: number): void {
        this.minKappa = min;
        this.maxKappa = max;
        this.validateBoundaries();
    }
}