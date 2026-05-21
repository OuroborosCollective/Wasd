// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: Date.now() };
  }
}
