export class FamilyGenerationSystem {
  createChild(parentA: any, parentB: any, childId: string) {
    return {
      id: childId,
      parents: [parentA.id, parentB.id],
      house: parentA.house || parentB.house || null,
      generation: Math.max(parentA.generation || 0, parentB.generation || 0) + 1
    };
  }
}