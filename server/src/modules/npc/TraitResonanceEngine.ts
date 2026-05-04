// @ts-nocheck
export interface TraitResonance {
  faith: number;
  aggression: number;
  curiosity: number;
}

/**
 * TraitResonanceEngine - Aggregates NPC traits within world chunks to calculate
 * "Genetic Resonance", which influences procedural world generation and gameplay buffs.
 */
export class TraitResonanceEngine {
  private chunkResonance: Map<string, TraitResonance> = new Map();
  private readonly chunkSize = 64;

  /** Get chunk key from world coordinates. */
  getChunkKey(x: number, y: number): string {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    return `${cx}:${cy}`;
  }

  /** Update resonance for a specific chunk based on NPCs currently present. */
  updateResonance(chunkKey: string, npcsInChunk: any[]) {
    if (npcsInChunk.length === 0) {
      this.chunkResonance.delete(chunkKey);
      return;
    }

    let totalFaith = 0;
    let totalAggression = 0;
    let totalCuriosity = 0;

    for (const npc of npcsInChunk) {
      // NPC traits from NPCPersonalityEngine
      const traits = npc.traits || { faith: 0, aggression: 0, curiosity: 0 };
      totalFaith += traits.faith || 0;
      totalAggression += traits.aggression || 0;
      totalCuriosity += traits.curiosity || 0;
    }

    const count = npcsInChunk.length;
    this.chunkResonance.set(chunkKey, {
      faith: totalFaith / count,
      aggression: totalAggression / count,
      curiosity: totalCuriosity / count,
    });
  }

  /** Get resonance scores for a chunk. */
  getResonance(chunkKey: string): TraitResonance {
    return this.chunkResonance.get(chunkKey) || { faith: 0, aggression: 0, curiosity: 0 };
  }

  /** Get all resonance data for synchronization. */
  getAllResonance(): Record<string, TraitResonance> {
    const data: Record<string, TraitResonance> = {};
    for (const [key, value] of this.chunkResonance.entries()) {
      data[key] = value;
    }
    return data;
  }
}
