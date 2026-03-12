import { NPCSystem } from "../npc/NPCSystem.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";

export class WorldEditorServer {
  constructor(private npcSystem: NPCSystem, private lootEntities: Map<string, any>) {}

  execute(command: any) {
    switch (command.action) {
      case "spawn_npc":
        return this.npcSystem.createNPC(command.npcId, command.name || "", command.x, command.y);

      case "spawn_loot":
        const id = `loot_editor_${Date.now()}`;
        const loot = {
          id,
          position: { x: command.x, y: command.y },
          item: ItemRegistry.createInstance(command.itemId) || { name: "Mystery Item", id: command.itemId }
        };
        this.lootEntities.set(id, loot);
        return loot;

      case "delete_entity":
        // Logic for deleting from NPC system or Loot map
        return { success: true };

      default:
        return { success: false, error: "Unknown action" };
    }
  }
}
