export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: Date.now() };
  }
}