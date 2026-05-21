// @ARE-GUARD-EXEMPT: Presence and session metadata; not world-state input.
export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: Date.now() };
  }
}