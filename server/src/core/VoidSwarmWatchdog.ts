import { VoidSwarmBrain, SwarmTarget } from '../modules/brain/VoidSwarmBrain.js';

/**
 * VoidSwarmWatchdog: Emergent PvE Macro-event
 * Validates fast-path deterministic collisions and damage across the swarm during the 10Hz tick.
 */
export class VoidSwarmWatchdog {
    private brain: VoidSwarmBrain;
    private swarmCenter = { x: 0, y: 0 }; // Simulating the actual swarm position moving towards target

    constructor(brain: VoidSwarmBrain) {
        this.brain = brain;
    }

    /**
     * Called in the 10Hz hot path.
     * Moves swarm deterministically and applies area damage to entities in its path.
     */
    public tickSwarmCollisions(entities: any[], structures: any[]) {
        const target = this.brain.getActiveSwarmTarget();
        if (!target) return;

        // Move swarm towards target deterministically (simplified for watchdog hotpath)
        const dx = target.x - this.swarmCenter.x;
        const dy = target.y - this.swarmCenter.y;

        // Normalize and step (speed depends on intensity)
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) {
            const speed = 0.5 * target.intensity; // Max 5 units per tick
            this.swarmCenter.x += (dx / dist) * speed;
            this.swarmCenter.y += (dy / dist) * speed;
        }

        const swarmRadiusSq = 100 * target.intensity; // Varies with intensity

        // Fast path entity damage
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!entity || !entity.position) continue;

            const edx = entity.position.x - this.swarmCenter.x;
            const edy = entity.position.y - this.swarmCenter.y;
            if ((edx * edx + edy * edy) < swarmRadiusSq) {
                // Apply deterministic void damage
                this.applyVoidDamage(entity, target.intensity);
            }
        }

        // Fast path structure damage
        for (let i = 0; i < structures.length; i++) {
            const structure = structures[i];
            if (!structure || !structure.position) continue;

            const sdx = structure.position.x - this.swarmCenter.x;
            const sdy = structure.position.y - this.swarmCenter.y;
            if ((sdx * sdx + sdy * sdy) < swarmRadiusSq) {
                 // Structures take heavier void damage
                this.applyVoidDamage(structure, target.intensity * 2);
            }
        }
    }

    private applyVoidDamage(target: any, damage: number) {
        if (target.health !== undefined) {
            target.health = Math.max(0, target.health - damage);
        }
    }
}
