export interface TickState<T> {
    tick: number;
    seed: number;
    data: T;
}

export interface Vector2 {
    x: number;
    y: number;
}

export class TickManager {
    /**
     * Erzeugt einen deterministischen Hash-Wert basierend auf Seed, Tick und optionalem Salt.
     * Nutzt einen LCG-Ansatz (Linear Congruential Generator) für Zustandslosigkeit.
     */
    public static getDeterministicRandom(seed: number, tick: number, salt: number = 0): number {
        let h = (seed ^ tick ^ (salt * 16777619)) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }

    /**
     * Berechnet den Zustand eines Objekts für einen spezifischen Tick T_n.
     * Die Logik ist rein funktional und hängt nur von den Eingabeparametern ab.
     */
    public static calculateStateAt<T>(
        seed: number,
        tick: number,
        processor: (tick: number, getRand: (salt: number) => number) => T
    ): T {
        const rng = (salt: number) => this.getDeterministicRandom(seed, tick, salt);
        return processor(tick, rng);
    }

    /**
     * Beispiel für eine zustandslose Positionsberechnung mit linearer Bewegung.
     */
    public static computeLinearPosition(
        tick: number,
        initialPos: Vector2,
        velocity: Vector2
    ): Vector2 {
        return {
            x: initialPos.x + velocity.x * tick,
            y: initialPos.y + velocity.y * tick
        };
    }

    /**
     * Beispiel für eine zustandslose Berechnung einer zufälligen Eigenschaft pro Tick.
     */
    public static computeDeterministicEvent(
        seed: number,
        tick: number,
        probability: number
    ): boolean {
        const chance = this.getDeterministicRandom(seed, tick, 888);
        return chance < probability;
    }

    /**
     * Berechnet die Differenz zwischen zwei Ticks deterministisch.
     */
    public static getDeltaBetween(
        seed: number,
        tickA: number,
        tickB: number,
        logic: (tick: number, getRand: (salt: number) => number) => number
    ): number {
        const valA = this.calculateStateAt(seed, tickA, logic);
        const valB = this.calculateStateAt(seed, tickB, logic);
        return valB - valA;
    }
}