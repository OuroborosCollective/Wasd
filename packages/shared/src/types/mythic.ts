/**
 * Mythic Soul-Link Types
 * Part of the Ouroboros Legend Cycle.
 */

export interface MythicAnchorComponent {
    type: 'MythicAnchor';
    data: {
        legendId: string;
        mythologicalWeight: number;
        resonanceFactor: number;
        participantIds: string[];
        isResonating: boolean;
        resonatingWith?: string;
        buffs?: string[];
    };
}

export interface MythicResonanceEvent {
    type: 'mythic_resonance_spike';
    entities: string[];
    legendId: string;
    spikeIntensity: number;
    position: { x: number; y: number; z: number };
}
