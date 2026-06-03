import { PlexityEngine } from '../shared/PlexityEngine.js';

export class QuantumNebulaPlexity {
    calculateQuantumNebulaPlexity(entity: any, distortionField: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Adjusts plexity using the distortion field for visual scrambled reality
        // More distortion increases plexity to create visual anomalies in rendering
        const scrambledPlexity = basePlexity * distortionField;

        return Math.min(Math.max(scrambledPlexity, 0), 1.0);
    }
}
