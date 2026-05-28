import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class FamilyGenerationSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  createChild(parents: string[], house: string) {
    const now = this.clock.now();
    return {
      id: `child:${house}:${now}`,
      parents,
      house,
      bornAt: now
    };
  }
}
