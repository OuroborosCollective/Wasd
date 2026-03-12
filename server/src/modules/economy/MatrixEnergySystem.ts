export class MatrixEnergySystem {
  private balances = new Map<string, number>();

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, current + amount);
  }

  consume(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    if (current < amount) return false;
    this.balances.set(playerId, current - amount);
    return true;
  }

  getBalance(playerId: string) {
    return this.balances.get(playerId) || 0;
  }
}