export class SessionRegistry {
  private sessions = new Map<string, any>();

  set(sessionId: string, data: any) {
    this.sessions.set(sessionId, data);
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId) || null;
  }

  remove(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}