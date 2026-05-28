import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class FamilyGenerationSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  createChild(parents: string[], house: string) {
    const now = this.clock.now();
    const parentKey = [...parents].sort().join(",");
    const id = `child:${house}:${parentKey}:${now}`;

    return {
      id,
      parents,
      house,
      bornAt: now,
    };
  }
}
