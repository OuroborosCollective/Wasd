export class NPCRelationshipSystem {
  private values = new Map<string, number>();
  key(a:string,b:string){ return `${a}:${b}`; }
  set(a:string,b:string,v:number){ this.values.set(this.key(a,b), v); }
  get(a:string,b:string){ return this.values.get(this.key(a,b)) ?? 0; }
}