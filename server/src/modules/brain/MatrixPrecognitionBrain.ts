// @ARE-GUARD-EXEMPT: non-sim module
export interface PrecognitionData {
  projectedLoad: number; // 0.0 to 1.0
  densitySpikeRisk: number; // 0.0 to 1.0
  timeToCritical: number; // milliseconds
}

export class MatrixPrecognitionBrain {
  private history: { timestamp: number; activeConnections: number; npcCount: number }[] = [];
  private readonly HISTORY_LIMIT = 60; // Keep last 60 samples
  private readonly CRITICAL_LOAD_THRESHOLD = 5000; // arbitrary unit representing danger

  public recordState(activeConnections: number, npcCount: number, timestamp = 0) {
    this.history.push({ timestamp, activeConnections, npcCount });
    if (this.history.length > this.HISTORY_LIMIT) {
      this.history.shift();
    }
  }

  public analyzeMatrixFlux(): PrecognitionData {
    if (this.history.length < 2) {
      return { projectedLoad: 0, densitySpikeRisk: 0, timeToCritical: -1 };
    }

    // Calculate rates of change
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const dt = (last.timestamp - first.timestamp) / 1000; // seconds

    if (dt <= 0) return { projectedLoad: 0, densitySpikeRisk: 0, timeToCritical: -1 };

    const connRate = (last.activeConnections - first.activeConnections) / dt;
    const npcRate = (last.npcCount - first.npcCount) / dt;

    // Projection for next 60 seconds
    const projectedConns = last.activeConnections + (connRate * 60);
    const projectedNPCs = last.npcCount + (npcRate * 60);

    const projectedLoadValue = (projectedConns * 1.5) + projectedNPCs;
    const projectedLoad = Math.max(0, Math.min(1, projectedLoadValue / this.CRITICAL_LOAD_THRESHOLD));

    // Density spike logic (rapid increase in players/NPCs)
    const densitySpikeRisk = Math.max(0, Math.min(1, (connRate + npcRate) / 50));

    let timeToCritical = -1;
    if (connRate > 0 || npcRate > 0) {
        const currentLoad = (last.activeConnections * 1.5) + last.npcCount;
        const loadRemaining = this.CRITICAL_LOAD_THRESHOLD - currentLoad;
        const totalRate = (connRate * 1.5) + npcRate;
        if (totalRate > 0) {
            timeToCritical = (loadRemaining / totalRate) * 1000; // in ms
        }
    }

    return {
      projectedLoad,
      densitySpikeRisk,
      timeToCritical
    };
  }
}
