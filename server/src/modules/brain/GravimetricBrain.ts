import { AREClock } from '../../core/determinism/AREDeterminism.js';

export interface SpatialEntity {
    id: string;
    mass: number;
    x: number;
    y: number;
    z: number;
}

export class GravimetricBrain {
    constructor(private clock: AREClock) {}

    /**
     * Deterministically computes the gravitational sink factor in a localized zone.
     * Uses deterministic sorting of entities to ensure identical results across nodes.
     */
    calculateGravityWell(entities: SpatialEntity[], zoneCenter: { x: number, y: number, z: number }): number {
        // Enforce a non-mutating deterministic sort to ensure hash consistency (Level-A Determinism rule)
        const sortedEntities = [...entities].sort((a, b) => a.id.localeCompare(b.id));

        let totalMassInZone = 0;

        for (const entity of sortedEntities) {
            const distSq =
                Math.pow(entity.x - zoneCenter.x, 2) +
                Math.pow(entity.y - zoneCenter.y, 2) +
                Math.pow(entity.z - zoneCenter.z, 2);

            // If entity is within 100 units of the center, contribute to mass
            if (distSq < 10000) {
                // Closer entities contribute slightly more perceived gravity distortion
                const falloff = 1 - (distSq / 10000);
                totalMassInZone += entity.mass * falloff;
            }
        }

        // Base gravity is 1.0. Massive concentrations increase this.
        return 1.0 + (totalMassInZone * 0.005);
    }
}
