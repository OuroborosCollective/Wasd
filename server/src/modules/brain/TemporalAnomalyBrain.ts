import { TemporalNode } from '../plexity/TemporalPlexityMatrix.js';

export interface TemporalAnomaly {
  id: string;
  center: { x: number, y: number, z: number };
  radius: number;
  intensity: number; // 0.0 to 1.0
  activeEchos: number;
}

export class TemporalAnomalyBrain {
  private activeAnomalies: Map<string, TemporalAnomaly> = new Map();
  private anomalyCounter = 0;

  public analyzeTemporalField(nodes: TemporalNode[]): TemporalAnomaly[] {
    const anomalies: TemporalAnomaly[] = [];

    for (const node of nodes) {
      if (node.dilationFactor < 0.5 || node.echoPotential > 5.0) {
        // High anomaly chance
        const intensity = 1.0 - node.dilationFactor;
        const anomalyId = `temp_anom_${this.anomalyCounter++}`;

        const anomaly: TemporalAnomaly = {
          id: anomalyId,
          center: { x: node.x, y: node.y, z: node.z },
          radius: 15 * intensity,
          intensity: intensity,
          activeEchos: Math.floor(node.echoPotential / 2)
        };

        anomalies.push(anomaly);
        this.activeAnomalies.set(anomalyId, anomaly);
      }
    }

    return anomalies;
  }
}
