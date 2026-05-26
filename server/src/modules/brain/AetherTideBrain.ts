import { AREClock, ARERng } from '../../core/determinism/AREDeterminism.js';
import { HeuristicWorldBrain, BrainNode } from './HeuristicWorldBrain.js';

export class AetherTideBrain {
    constructor(
        private worldBrain: HeuristicWorldBrain,
        private clock: AREClock,
        private rng: ARERng
    ) {}

    calculateAetherSaturation(regionId: string): number {
        // Base saturation oscillates deterministically over time
        const timeNow = this.clock.now();
        const cycleDurationMs = 3600000; // 1 hour cycle
        const phase = (timeNow % cycleDurationMs) / cycleDurationMs;

        let baseSaturation = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // Range 0.0 to 1.0

        // Incorporate specific region seed for deterministic chaos
        const regionRng = this.rng.fork(`aether_${regionId}_${Math.floor(timeNow / cycleDurationMs)}`);

        // Add a small randomized deterministic fluctuation
        const fluctuation = (regionRng.nextFloat() - 0.5) * 0.2;

        return Math.max(0, Math.min(1, baseSaturation + fluctuation));
    }
}
