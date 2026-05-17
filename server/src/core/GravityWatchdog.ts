import { type EntityState } from "../modules/types";

export interface GravityFluxZone {
    id: string;
    center: { x: number, y: number };
    radius: number;
    gravityModifier: number; // 1.0 is normal, < 1 is low gravity, > 1 is high gravity
    expiresAtTick: number;
}

/**
 * GravityWatchdog
 * Watchdog (Core) logic for deterministic 10Hz tick processing of Gravity Flux Anomalies.
 * Applies deterministic gravity modifiers to entity velocities or positions.
 */
export class GravityWatchdog {
    private activeZones: Map<string, GravityFluxZone> = new Map();

    /**
     * Spawns a new Gravity Flux Zone deterministically.
     */
    public spawnZone(id: string, x: number, y: number, radius: number, modifier: number, durationTicks: number, currentTick: number): void {
        this.activeZones.set(id, {
            id,
            center: { x, y },
            radius,
            gravityModifier: modifier,
            expiresAtTick: currentTick + durationTicks
        });
    }

    /**
     * Cleans up expired zones.
     */
    public purgeExpiredZones(currentTick: number): void {
        const toRemove: string[] = [];
        for (const [id, zone] of this.activeZones.entries()) {
            if (currentTick >= zone.expiresAtTick) {
                toRemove.push(id);
            }
        }

        // Deterministic removal
        toRemove.sort();
        for (const id of toRemove) {
            this.activeZones.delete(id);
        }
    }

    /**
     * Applies gravity modifiers to a list of entities deterministically.
     * Must be called within the 10Hz tick.
     */
    public applyGravityModifiers(entities: EntityState[], currentTick: number): void {
        this.purgeExpiredZones(currentTick);

        if (this.activeZones.size === 0) return;

        // Note: For deterministic execution, iterate over a sorted list if modifying state
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity || !entity.position) continue;

            // Default gravity modifier
            let currentModifier = 1.0;

            for (const zone of this.activeZones.values()) {
                const ex = Number(entity.position.x ?? 0);
                const ey = Number(entity.position.y ?? entity.position.z ?? 0); // Assuming 2D planar check for now

                const dx = ex - zone.center.x;
                const dy = ey - zone.center.y;
                const distSq = dx * dx + dy * dy;

                if (distSq <= zone.radius * zone.radius) {
                    // Combine modifiers if in multiple zones, or just take the strongest?
                    // For determinism and simplicity, we just multiply them.
                    currentModifier *= zone.gravityModifier;
                }
            }

            // Apply deterministic modifier if needed (e.g., set a property that the movement logic will read)
            if (currentModifier !== 1.0) {
                 // Format value with standard scale factor: 1000
                 const deterministicModifier = Math.floor(currentModifier * 1000 + 1e-9) / 1000;

                 // Suppose entity has a velocity or physics payload. We'll set a generic gravityModifier state.
                 // For Havok/Engine integration, this would inform the next tick's velocity calculation.
                 (entity as any).gravityModifier = deterministicModifier;
            } else {
                 (entity as any).gravityModifier = 1.0;
            }
        }
    }

    public getActiveZones(): GravityFluxZone[] {
        // Return deterministically sorted zones
        return Array.from(this.activeZones.values()).sort((a, b) => a.id.localeCompare(b.id));
    }
}
