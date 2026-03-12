export class NPCRelationshipSystem {
  private relations = new Map<string, Record<string, number>>();

  set(a: string, b: string, value: number) {
    if (!this.relations.has(a)) this.relations.set(a, {});
    this.relations.get(a)![b] = value;
    return value;
  }

  get(a: string, b: string) {
    return this.relations.get(a)?.[b] || 0;
  }
}