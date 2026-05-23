export class FamilyGenerationSystem {
  createChild(parents: string[], house: string) {
    return {
      id: `child:${house}:${Date.now()}`,
      parents,
      house,
      bornAt: Date.now()
    };
  }
}