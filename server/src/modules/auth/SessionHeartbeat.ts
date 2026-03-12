export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: Date.now()
    };
  }
}