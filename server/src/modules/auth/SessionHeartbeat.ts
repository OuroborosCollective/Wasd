// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: Date.now()
    };
  }
}
