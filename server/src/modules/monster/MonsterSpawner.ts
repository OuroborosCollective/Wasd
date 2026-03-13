import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";
import { FieldAnalysisResult } from "../brain/BrainFieldAnalyzer";

export interface MonsterSpawnConfig {
  species: string;
  biome: string;
  count: number;
  position: { x: number; y: number; z: number };
}

export class MonsterSpawner {
  /**
   * Spawnt ein einzelnes Monster basierend auf Spezies und Biom.
   */
  spawn(species: string, biome: string, position: { x: number; y: number; z: number }) {
    const dna = generateMonsterDNA(species);
    const monster = mutateMonster(dna, biome);
    monster.position = position; // Setze die Position des Monsters
    console.log(`Spawned ${monster.name} (${species}) in ${biome} at (${position.x}, ${position.y}, ${position.z})`);
    return monster;
  }

  /**
   * Spawnt Monster in einem Chunk basierend auf der Feldanalyse.
   * @param chunkId Die ID des Chunks.
   * @param fieldAnalysis Die Analyseergebnisse des BrainFieldAnalyzer für diesen Chunk.
   * @returns Eine Liste der gespawnten Monster.
   */
  spawnMonstersBasedOnField(chunkId: string, fieldAnalysis: FieldAnalysisResult): any[] {
    const spawnedMonsters: any[] = [];
    const [chunkX, chunkY] = this.parseChunkId(chunkId);

    // Beispiel: Wenn eine MONSTER_SURGE Bedrohung vorliegt, spawne mehr Monster
    if (fieldAnalysis.emergentThreats.includes("MONSTER_SURGE")) {
      const baseMonsterCount = Math.floor(fieldAnalysis.fieldValues.danger * 5) + 2; // Mehr Monster bei höherer Gefahr
      console.log(`MONSTER_SURGE detected in chunk ${chunkId}. Spawning ${baseMonsterCount} additional monsters.`);

      for (let i = 0; i < baseMonsterCount; i++) {
        // Zufällige Position innerhalb des Chunks
        const position = {
          x: chunkX * 100 + Math.random() * 100, // Annahme: Chunk-Größe 100x100
          y: 0, // Annahme: Bodenhöhe
          z: chunkY * 100 + Math.random() * 100,
        };
        // Beispiel-Spezies und Biom - könnte auch dynamisch aus Feldanalyse abgeleitet werden
        const species = this.getRandomMonsterSpecies(fieldAnalysis.fieldValues.danger);
        const biome = "forest"; // Oder aus Chunk-Daten
        spawnedMonsters.push(this.spawn(species, biome, position));
      }
    }

    // TODO: Weitere Spawning-Logik basierend auf anderen Feldwerten oder Gelegenheiten

    return spawnedMonsters;
  }

  private parseChunkId(chunkId: string): [number, number] {
    const [x, y] = chunkId.split(":").map(Number);
    return [x, y];
  }

  private getRandomMonsterSpecies(dangerLevel: number): string {
    if (dangerLevel > 0.8) return "dragon";
    if (dangerLevel > 0.6) return "skeleton";
    return "wolf";
  }
}
