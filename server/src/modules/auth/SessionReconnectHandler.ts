export class SessionReconnectHandler {
  reconnect(sessionRegistry: any, sessionId: string) {
    return sessionRegistry.get(sessionId);
  }
}