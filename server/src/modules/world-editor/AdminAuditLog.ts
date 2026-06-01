export class AdminAuditLog {
  private entries: any[] = [];

  log(actorId: string, action: string, payload: any) {
    this.entries.push({
      actorId,
      action,
      payload,
      timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    });
  }

  all() {
    return this.entries;
  }
}