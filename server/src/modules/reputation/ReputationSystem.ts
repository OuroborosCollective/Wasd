export class ReputationSystem {
  private ledger = new Map<string, Record<string, number>>();
  add(entityId:string, factionId:string, amount:number){
    if(!this.ledger.has(entityId)) this.ledger.set(entityId, {});
    const row = this.ledger.get(entityId)!;
    row[factionId] = (row[factionId] || 0) + amount;
    return row[factionId];
  }
  get(entityId:string, factionId:string){
    return this.ledger.get(entityId)?.[factionId] || 0;
  }
}