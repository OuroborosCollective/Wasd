// @ARE-GUARD-EXEMPT: Event creation timestamps; not world-state input.
export class WorldEventLayer {
  create(type:string, payload:any = {}){
    return { type, payload, createdAt: Date.now() };
  }
}