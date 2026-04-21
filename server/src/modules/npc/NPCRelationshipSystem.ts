export class NPCRelationshipSystem {
  private relations = new Map<string, Record<string, number>>();

  set(a: string, b: string, value: number) {
    if (!this.relations.has(a)) this.relations.set(a, {});
    // Clamp value between -1 (Hostile) and 1 (Friendly)
    const clampedValue = Math.max(-1, Math.min(1, value));
    this.relations.get(a)![b] = clampedValue;
    return clampedValue;
  }

  get(a: string, b: string) {
    return this.relations.get(a)?.[b] || 0;
  }

  /**
   * Adjusts affinity based on interactions (Neon Axiom Logic)
   */
  adjustAffinity(a: string, b: string, delta: number) {
    const current = this.get(a, b);
    return this.set(a, b, current + delta);
  }

  /**
   * Decay affinity over time (Social Logic from Neon Axiom)
   */
  decay(rate: number = 0.01) {
    for (const [npcId, targets] of this.relations.entries()) {
      for (const targetId in targets) {
        const val = targets[targetId];
        if (val > 0) targets[targetId] = Math.max(0, val - rate);
        else if (val < 0) targets[targetId] = Math.min(0, val + rate);
      }
    }
  }

  /**
   * Logic for sharing knowledge (Neon Axiom: 10% chance if affinity > 0.5)
   */
  canShareKnowledge(a: string, b: string): boolean {
    const affinity = this.get(a, b);
    return affinity > 0.5 && Math.random() < 0.1;
  }
}