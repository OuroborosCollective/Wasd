// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class WorldEventLayer {
  create(type:string, payload:any = {}){
    return { type, payload, createdAt: Date.now() };
  }
}
