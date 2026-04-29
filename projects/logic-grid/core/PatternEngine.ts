export interface PatternParameters {
    frequency: number;
    damping: number;
    phaseShift: number;
    amplitude: number;
    speed: number;
    resolution: number;
}

export enum PatternType {
    RADIAL_WAVE = 'RADIAL_WAVE',
    LINEAR_GROWTH = 'LINEAR_GROWTH',
    HARMONIC_OSCILLATION = 'HARMONIC_OSCILLATION',
    ORGANIC_NOISE = 'ORGANIC_NOISE'
}

export class PatternEngine {
    constructor() {}

    /**
     * Berechnet den Zustand einer einzelnen Zelle basierend auf mathematischen Wachstumsmustern.
     */
    public calculateCellState(
        x: number,
        y: number,
        time: number,
        type: PatternType,
        params: PatternParameters
    ): number {
        switch (type) {
            case PatternType.RADIAL_WAVE:
                return this.computeRadialWave(x, y, time, params);
            case PatternType.LINEAR_GROWTH:
                return this.computeLinearGrowth(x, y, time, params);
            case PatternType.HARMONIC_OSCILLATION:
                return this.computeHarmonic(x, y, time, params);
            case PatternType.ORGANIC_NOISE:
                return this.computeOrganicNoise(x, y, time, params);
            default:
                return 0;
        }
    }

    /**
     * Erzeugt eine kreisförmige Wellenfront mit exponentieller Dämpfung.
     */
    private computeRadialWave(x: number, y: number, t: number, p: PatternParameters): number {
        const distance = Math.sqrt(x * x + y * y);
        const spatialComponent = distance * p.frequency;
        const temporalComponent = t * p.speed;
        const phase = p.phaseShift;
        
        const wave = Math.sin(spatialComponent - temporalComponent + phase);
        const dampingFactor = Math.exp(-p.damping * distance);
        
        return wave * p.amplitude * dampingFactor;
    }

    /**
     * Simuliert gerichtetes Wachstum durch eine Sigmoid-Funktion (tanh).
     */
    private computeLinearGrowth(x: number, y: number, t: number, p: PatternParameters): number {
        const angle = p.phaseShift;
        const projection = x * Math.cos(angle) + y * Math.sin(angle);
        const growth = Math.tanh((t * p.speed - projection) * p.frequency);
        const damping = Math.exp(-p.damping * Math.abs(projection));
        
        return (growth + 1) * 0.5 * p.amplitude * damping;
    }

    /**
     * Überlagerung harmonischer Schwingungen für komplexe Interferenzmuster.
     */
    private computeHarmonic(x: number, y: number, t: number, p: PatternParameters): number {
        const h1 = Math.sin(x * p.frequency + t * p.speed);
        const h2 = Math.sin(y * p.frequency + t * p.speed + p.phaseShift);
        const h3 = Math.sin((x + y) * p.frequency * 0.5 - t * p.speed * 0.5);
        
        const combined = (h1 + h2 + h3) / 3;
        const radialDamping = Math.exp(-p.damping * Math.sqrt(x * x + y * y));
        
        return combined * p.amplitude * radialDamping;
    }

    /**
     * Deterministisches Pseudo-Rauschen zur Simulation organischer Strukturen.
     */
    private computeOrganicNoise(x: number, y: number, t: number, p: PatternParameters): number {
        const nx = x * p.frequency;
        const ny = y * p.frequency;
        const nt = t * p.speed;
        
        // Pseudo-random organic field
        const val = Math.sin(nx + Math.cos(ny + nt)) * 
                    Math.cos(ny + Math.sin(nx - nt + p.phaseShift));
        
        const spatialDamping = 1.0 / (1.0 + (x * x + y * y) * p.damping);
        return val * p.amplitude * spatialDamping;
    }

    /**
     * Injiziert das berechnete Pattern in ein flaches Grid-Array.
     */
    public generateGridBuffer(
        width: number,
        height: number,
        time: number,
        type: PatternType,
        params: PatternParameters
    ): Float32Array {
        const buffer = new Float32Array(width * height);
        const centerX = width / 2;
        const centerY = height / 2;

        for (let y = 0; y < height; y++) {
            const rowOffset = y * width;
            const dy = (y - centerY) / params.resolution;
            
            for (let x = 0; x < width; x++) {
                const dx = (x - centerX) / params.resolution;
                buffer[rowOffset + x] = this.calculateCellState(dx, dy, time, type, params);
            }
        }
        
        return buffer;
    }
}