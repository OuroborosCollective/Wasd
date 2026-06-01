export class WebSocketPresence {
  setOnline(playerId:string){
    return { playerId, online: true, changedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ };
  }
}