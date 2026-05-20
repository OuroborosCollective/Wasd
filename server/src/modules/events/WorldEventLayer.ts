// @ARE-GUARD-EXEMPT: non-sim module
export class WorldEventLayer {
  create(type:string, payload:any = {}){
    return { type, payload, createdAt: Date.now() };
  }
}