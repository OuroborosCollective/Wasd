export class IgnoreSystem {
  private ignores = new Map<string, Set<string>>();

  add(playerId: string, ignoredId: string) {
    if (!this.ignores.has(playerId)) this.ignores.set(playerId, new Set());
    this.ignores.get(playerId)!.add(ignoredId);
  }

  list(playerId: string) {
    return [...(this.ignores.get(playerId) || new Set())];
  }
}