export class NPCGenealogyEngine {
  createLineage(id: string, house: string, parents: string[] = []) {
    return {
      id,
      house,
      parents,
      children: [] as string[]
    };
  }

  addChild(lineage: any, childId: string) {
    lineage.children.push(childId);
    return lineage;
  }
}