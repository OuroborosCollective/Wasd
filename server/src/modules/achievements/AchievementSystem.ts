export class AchievementSystem {
  private unlocked = new Map<string, Set<string>>();

  unlock(playerId: string, achievementId: string) {
    if (!this.unlocked.has(playerId)) this.unlocked.set(playerId, new Set());
    this.unlocked.get(playerId)!.add(achievementId);
    return achievementId;
  }

  list(playerId: string) {
    return [...(this.unlocked.get(playerId) || new Set())];
  }
}