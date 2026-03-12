export class SiegeEngine {
  applySiegeDamage(structure: any, amount: number) {
    structure.hitpoints = Math.max(0, (structure.hitpoints || 100) - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }

  breachGate(gate: any) {
    gate.state = "destroyed";
    return gate;
  }
}