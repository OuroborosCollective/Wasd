export class ReputationLedger {
  private values = new Map<string, number>();
  add(key: string, amount: number) { this.values.set(key, (this.values.get(key) || 0) + amount); }
  get(key: string) { return this.values.get(key) || 0; }
}