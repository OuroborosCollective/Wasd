export class DudenregisterHistory {
  private history: any[] = [];

  record(event: any) {
    this.history.push(event);
  }

  getHistory() {
    return this.history;
  }
}