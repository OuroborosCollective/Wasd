import { PlexityEngine } from '../shared/PlexityEngine.js';

export class DreamWeavePlexity {
    calculateDreamWeavePlexity(entity: any, illusionStrength: number): number {
        // Base plexity of the entity
        const basePlexity = PlexityEngine.calculatePlexity(entity);

        // Amplifies perceived plexity to create "blingbling" graphics without adding logical intelligence load
        // Simply pushes the visual complexity to the maximum allowed by the engine
        const illusionPlexity = basePlexity * illusionStrength;

        return Math.min(Math.max(illusionPlexity, 0), 1.0);
    }
}
