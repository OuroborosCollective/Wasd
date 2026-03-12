export class QuestStateStore {
  private states = new Map<string, any[]>();
  set(playerId:string, quests:any[]){
    this.states.set(playerId, quests);
  }
  get(playerId:string){
    return this.states.get(playerId) || [];
  }
}