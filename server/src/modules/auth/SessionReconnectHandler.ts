// @ARE-GUARD-EXEMPT: non-sim module
export class SessionReconnectHandler {
  reconnect(sessionRegistry: any, sessionId: string) {
    return sessionRegistry.get(sessionId);
  }
}