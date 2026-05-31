import { areTopologyNetwork, type ARETopologySnapshot } from '../../are/ARETopologyNetwork';

export interface ShadowGate {
  id: string;
  centerEntityId: string;
  intensity: number; // 0.0 to 1.0
  omega: number;
  tick: number;
}

export class AREShadowGateAdapter {
  private static readonly DENSITY_THRESHOLD = 5; // Minimum nodes for a gate
  private static readonly RESONANCE_KAPPA = 1000;

  /**
   * Scans the topology for "Shadow Gates" - regions of high interaction density.
   * Shadow Gates represent points where the ARE resonance is leaking into the physical world.
   */
  static detectShadowGates(tick: number): ShadowGate[] {
    const snapshot: ARETopologySnapshot = areTopologyNetwork.snapshot(tick, 100);
    const gates: ShadowGate[] = [];

    // Heuristic: identify nodes with high Omega (low effective distance to core)
    // and that are part of a sufficiently large interaction network.
    if (snapshot.nodeCount >= this.DENSITY_THRESHOLD) {
      const highResonanceNodes = snapshot.nodes
        .filter(n => n.omega > 800)
        .sort((a, b) => b.omega - a.omega);

      // Take top 3 highest resonance points as potential gates
      for (const node of highResonanceNodes.slice(0, 3)) {
        gates.push({
          id: `gate:${node.entityId}:${tick}`,
          centerEntityId: node.entityId,
          intensity: node.omega / this.RESONANCE_KAPPA,
          omega: node.omega,
          tick: tick
        });
      }
    }

    return gates;
  }
}
