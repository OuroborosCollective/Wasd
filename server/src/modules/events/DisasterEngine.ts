// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class DisasterEngine {
  createDisaster(region:string){
    const list = ["fire","storm","blight","collapse"];
    return { region, type: list[Math.floor(Math.random()*list.length)] };
  }
}