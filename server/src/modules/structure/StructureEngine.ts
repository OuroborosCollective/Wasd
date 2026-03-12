export class StructureEngine {
  private structures = new Map<string, any>();

  createStructure(structure: any) {
    this.structures.set(structure.structureId, structure);
    return structure;
  }

  getStructure(id: string) {
    return this.structures.get(id) ?? null;
  }

  damageStructure(id: string, amount: number) {
    const structure = this.structures.get(id);
    if (!structure) return null;
    structure.hitpoints = Math.max(0, structure.hitpoints - amount);
    if (structure.hitpoints === 0) structure.destroyed = true;
    return structure;
  }
}