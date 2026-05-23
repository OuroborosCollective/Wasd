export class AdminAuditLog {
  private entries: any[] = [];

  log(actorId: string, action: string, payload: any) {
    this.entries.push({
      actorId,
      action,
      payload,
      timestamp: Date.now()
    });
  }

  all() {
    return this.entries;
  }
}