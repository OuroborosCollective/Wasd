// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class DiplomacyEngine {
  treaty(a:string,b:string,type:string){
    return { a, b, type, signedAt: Date.now() };
  }
}