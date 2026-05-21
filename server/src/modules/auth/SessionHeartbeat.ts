// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: Date.now()
    };
  }
}