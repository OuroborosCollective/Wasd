export class DudenregisterHistory {
  private history: any[] = [];
  private readonly MAX_ENTRIES = 1000;

  record(event: { type: string, detail: string, actorId: string }) {
    this.history.unshift({
      ...event,
      timestamp: Date.now()
    });
    if (this.history.length > this.MAX_ENTRIES) {
      this.history.pop();
    }
    console.log(`[Dudenregister] ${event.type}: ${event.detail}`);
  }

  getHistory(limit: number = 10) {
    return this.history.slice(0, limit);
  }
}
