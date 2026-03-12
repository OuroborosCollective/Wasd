export class FactionSystem {
  private factions = new Map<string, any>();
  create(id:string, data:any){
    this.factions.set(id, { id, ...data });
    return this.factions.get(id);
  }
  get(id:string){
    return this.factions.get(id);
  }
}