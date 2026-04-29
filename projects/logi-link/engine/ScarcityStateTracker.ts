export class ScarcityStateTracker {
  private scarcityCounters: Map<string, number> = new Map();

  public update(regionId: string, resourceId: string, currentAmount: number, safetyThreshold: number): void {
    const key = this.generateKey(regionId, resourceId);
    const currentCount = this.scarcityCounters.get(key) || 0;

    if (currentAmount < safetyThreshold) {
      this.scarcityCounters.set(key, currentCount + 1);
    } else {
      this.scarcityCounters.set(key, 0);
    }
  }

  public getScarcityDuration(regionId: string, resourceId: string): number {
    return this.scarcityCounters.get(this.generateKey(regionId, resourceId)) || 0;
  }

  public reset(regionId: string, resourceId: string): void {
    this.scarcityCounters.delete(this.generateKey(regionId, resourceId));
  }

  private generateKey(regionId: string, resourceId: string): string {
    return `${regionId}:${resourceId}`;
  }
}