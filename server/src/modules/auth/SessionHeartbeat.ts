export class SessionHeartbeat {
  ping(sessionId:string){
    return {
      sessionId,
      heartbeatAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}