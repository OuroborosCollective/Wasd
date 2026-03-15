export class MatrixEnergySystem {
  private balances = new Map<string, number>();
  private readonly REGEN_RATE = 1;
  private readonly MAX_ENERGY = 1000;

  add(playerId: string, amount: number) {
    const current = this.balances.get(playerId) || 0;
    this.balances.set(playerId, Math.min(this.MAX_ENERGY, current + amount));
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

  tick(playerIds: string[]) {
    playerIds.forEach(id => {
      this.add(id, this.REGEN_RATE);
    });
  }
}
