import { HeuristicWorldBrain, BrainNode } from './HeuristicWorldBrain.js';

/**
 * Resonance Field Brain
 * Processes boolean intersections of world logic to manage zone states.
 */
export class ResonanceFieldBrain {
    constructor(private worldBrain: HeuristicWorldBrain) {}

    /**
     * Determines if a zone reaches true resonance logically.
     */
    evaluateZoneResonance(zoneSignature: string): boolean {
        const nodes: BrainNode[] = (this.worldBrain as any).nodes;
        if (!nodes) return false;

        const magicDensity = nodes.find(n => n.id === 'magic_density');

        // Purely logical deterministic check
        const isHighMagic = magicDensity ? magicDensity.value > 0.8 : false;
        const signatureMatches = zoneSignature.endsWith('_AETHER');

        return isHighMagic && signatureMatches;
    }
}
