export class ReputationSystem {
  private reputations = new Map<string, Record<string, number>>();

  add(sourceId: string, targetId: string, delta: number) {
    if (!this.reputations.has(sourceId)) this.reputations.set(sourceId, {});
    const row = this.reputations.get(sourceId)!;
    row[targetId] = (row[targetId] || 0) + delta;
    return row[targetId];
  }

  get(sourceId: string, targetId: string) {
    return this.reputations.get(sourceId)?.[targetId] || 0;
  }
}