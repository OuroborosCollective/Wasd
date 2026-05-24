import { CausalityFractureWatchdog } from '../../core/watchdogs/CausalityFractureWatchdog';
import { FractureEntityBrain } from '../brain/FractureEntityBrain';

export class FracturePlexityNode {
  private watchdog: CausalityFractureWatchdog;
  private brain: FractureEntityBrain;

  constructor(watchdog: CausalityFractureWatchdog, brain: FractureEntityBrain) {
    this.watchdog = watchdog;
    this.brain = brain;
  }

  public computeDistortionMatrix(tick: number): Map<string, number> {
    const grids = this.watchdog.getFractureThresholds();
    const distortionMap: Map<string, number> = new Map();

    for (const grid of grids) {
      if (grid.intensity > 100) {
        // Deterministic sine wave distortion simulation based on tick
        const distortion = grid.intensity * (1.0 + Math.sin(tick * 0.01));
        distortionMap.set(grid.gridId, distortion);
      }
    }

    // Trigger the brain to read watchdog's latest spikes
    this.brain.spawnAnomalies(tick);

    return distortionMap;
  }
}
