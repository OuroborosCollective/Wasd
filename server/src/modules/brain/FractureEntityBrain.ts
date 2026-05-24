import { CausalityFractureWatchdog } from '../../core/watchdogs/CausalityFractureWatchdog';

export class FractureEntityBrain {
  private watchdog: CausalityFractureWatchdog;
  private fractureLimit: number = 500.0;

  constructor(watchdog: CausalityFractureWatchdog) {
    this.watchdog = watchdog;
  }

  public spawnAnomalies(tick: number): Array<{ gridId: string, anomalyRule: string }> {
    const grids = this.watchdog.getFractureThresholds();
    const anomalies: Array<{ gridId: string, anomalyRule: string }> = [];

    for (const grid of grids) {
      if (grid.intensity >= this.fractureLimit) {
        // Reverse logic rules deterministically
        const ruleIndex = Math.floor(grid.intensity + tick) % 3;
        const invertedRules = ['InvertedGravity', 'MirroredDamage', 'TimeDilation'];

        anomalies.push({
          gridId: grid.gridId,
          anomalyRule: invertedRules[ruleIndex]
        });
      }
    }

    return anomalies;
  }
}
