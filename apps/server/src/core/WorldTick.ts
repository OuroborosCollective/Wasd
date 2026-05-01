import { World } from "./World";
import { NPC } from "../entities/NPC";
import { NPCRelationshipSystem } from "../systems/NPCRelationshipSystem";

export class WorldTick {
    /**
     * Executes a single world tick, updating all entities and systems.
     * @param world The current World instance.
     * @param deltaTime The time elapsed since the last tick in milliseconds.
     */
    public static tick(world: World, deltaTime: number): void {
        const npcs: NPC[] = world.getNPCs();
        
        // Fix: Accessing NPCRelationshipSystem via getInstance() due to private constructor
        const relationshipSystem = NPCRelationshipSystem.getInstance();

        npcs.forEach((npc: NPC): void => {
            // Update NPC internal state and AI
            npc.update(deltaTime);

            // Fix TS18048: Add optional chaining to health checks
            if (npc.health?.current !== undefined && npc.health.current <= 0) {
                this.handleNPCDeath(world, npc);
                return;
            }

            // Update NPC social relationships
            relationshipSystem.updateNPC(npc, deltaTime);
        });

        // Trigger world-level events or physics steps
        world.getSystems().forEach((system: any) => {
            if (typeof system.update === 'function') {
                system.update(deltaTime);
            }
        });
    }

    /**
     * Handles cleanup and logic when an NPC dies.
     * @param world The world instance.
     * @param npc The NPC that has died.
     */
    private static handleNPCDeath(world: World, npc: NPC): void {
        world.removeEntity(npc.id);
        
        // Clear references from the relationship system
        const relationshipSystem = NPCRelationshipSystem.getInstance();
        relationshipSystem.clearEntityRelationships(npc.id);
    }
}