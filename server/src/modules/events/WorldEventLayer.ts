export class WorldEventLayer {
  create(type:string, payload:any = {}){
    return { type, payload, createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}