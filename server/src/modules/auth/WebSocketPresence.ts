// @ARE-GUARD-EXEMPT: non-sim module
export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: Date.now() };
  }
}