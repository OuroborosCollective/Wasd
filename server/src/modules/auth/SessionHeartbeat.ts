// @ARE-GUARD-EXEMPT: Session heartbeat; not simulation input.
export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: Date.now()
    };
  }
}