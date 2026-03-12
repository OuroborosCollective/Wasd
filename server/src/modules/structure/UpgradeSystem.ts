export class UpgradeSystem {
  upgrade(structure: any) {
    structure.level = (structure.level || 1) + 1;
    structure.maxHitpoints = (structure.maxHitpoints || 100) + 50;
    structure.hitpoints = structure.maxHitpoints;
    return structure;
  }
}