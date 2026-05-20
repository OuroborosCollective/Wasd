// @ARE-GUARD-EXEMPT: non-sim module
export class UpgradeSystem {
  upgrade(structure:any, targetLevel:number) {
    structure.level = Math.max(structure.level ?? 1, targetLevel);
    return structure;
  }
}