export class QuestStateStore {
  private states = new Map<string, any[]>();

  add(playerId: string, quest: any) {
    if (!this.states.has(playerId)) this.states.set(playerId, []);
    this.states.get(playerId)!.push(quest);
  }

  list(playerId: string) {
    return this.states.get(playerId) || [];
  }
}