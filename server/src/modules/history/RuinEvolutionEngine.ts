import { DungeonGenerator } from "../dungeon/DungeonGenerator.js";

export class RuinEvolutionEngine {
  private dungeonGen = new DungeonGenerator();

  evolve(structure: any, worldTick: number) {
    // If it's a ruin, it has a chance to become a dungeon
    if (structure.type === "ruin" && !structure.isDungeon) {
      // 1% chance every 1000 ticks or something similar
      const chance = 0.05;
      if (Math.random() < chance) {
        structure.isDungeon = true;
        structure.dungeonData = this.dungeonGen.generate(worldTick + structure.x + structure.y);
        structure.lastEvolved = worldTick;
        console.log(`Ruin at ${structure.x}:${structure.y} has evolved into a Dungeon!`);
      }
    }
    return structure;
  }
}
