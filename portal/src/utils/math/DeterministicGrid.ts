export interface GridDimensions {
    width: number;
    height: number;
    depth: number;
}

export interface HardwareMetrics {
    cpuEntropy: number;
    memoryJitter: number;
    latencyNanoseconds: number;
    hardwareIdHash: string;
}

export interface GridCoordinate {
    x: number;
    y: number;
    z: number;
}

export class DeterministicGrid {
    private static readonly SCALE_FACTOR = 1000000;

    /**
     * Transformiert Hardware-Metriken in eine deterministische Gitter-Koordinate.
     * Nutzt Quantisierung, um Rauschen in den Messwerten zu eliminieren.
     */
    public static calculateLogicalIndex(metrics: HardwareMetrics, dimensions: GridDimensions): GridCoordinate {
        const x = this.quantize(metrics.cpuEntropy, metrics.hardwareIdHash, dimensions.width);
        const y = this.quantize(metrics.memoryJitter, metrics.hardwareIdHash, dimensions.height);
        const z = this.quantize(metrics.latencyNanoseconds / this.SCALE_FACTOR, metrics.hardwareIdHash, dimensions.depth);

        return { x, y, z };
    }

    /**
     * Erzeugt einen flachen Index aus 3D-Koordinaten für die Speicherung.
     */
    public static flattenIndex(coord: GridCoordinate, dimensions: GridDimensions): number {
        return coord.x + dimensions.width * (coord.y + dimensions.height * coord.z);
    }

    /**
     * Quantisiert einen Fließkommawert unter Einbeziehung eines Salt-Hashes.
     */
    private static quantize(value: number, salt: string, max: number): number {
        const hashBuffer = this.simpleHash(salt + value.toFixed(4));
        const normalized = Math.abs(hashBuffer % max);
        return Math.floor(normalized);
    }

    /**
     * Einfacher deterministischer Hash-Algorithmus für String-Eingaben.
     */
    private static simpleHash(input: string): number {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Berechnet die Ähnlichkeit zwischen zwei Gitterpunkten (Manhattan-Distanz).
     * Dient der Validierung bei minimalen Hardware-Schwankungen.
     */
    public static getDistance(a: GridCoordinate, b: GridCoordinate): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    }

    /**
     * Prüft, ob ein Punkt innerhalb eines definierten Toleranzbereichs liegt.
     */
    public static isWithinTolerance(origin: GridCoordinate, target: GridCoordinate, tolerance: number): boolean {
        return this.getDistance(origin, target) <= tolerance;
    }
}