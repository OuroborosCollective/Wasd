export class ChronoRiftBrain {
  private regionDilationFactors: Map<string, number> = new Map();

  public applyTimeDilation(regionId: string, severity: number) {
    // 1.0 is normal time, 0.5 is half-speed
    const factor = Math.max(0.1, 1.0 - (severity / 100));
    this.regionDilationFactors.set(regionId, factor);
    console.log(`[Brain] Applied time dilation factor ${factor} to region: ${regionId}`);
  }

  public getDilationFactor(regionId: string): number {
    return this.regionDilationFactors.get(regionId) || 1.0;
  }

  public normalizeTime(regionId: string) {
    this.regionDilationFactors.delete(regionId);
    console.log(`[Brain] Time normalized in region: ${regionId}`);
  }
}