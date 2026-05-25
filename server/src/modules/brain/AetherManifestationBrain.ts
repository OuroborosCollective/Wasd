import { AetherNode } from '../plexity/AetherResonanceField.js';

export interface ResonanceCascade {
  id: string;
  epicenter: { x: number, y: number, z: number };
  magnitude: number;
  linkedNodesCount: number;
  timeToDetonation: number; // in ticks
}

export class AetherManifestationBrain {
  private activeCascades: Map<string, ResonanceCascade> = new Map();
  private cascadeCounter = 0;

  public evaluateManifestations(nodes: AetherNode[]): ResonanceCascade[] {
      const cascades: ResonanceCascade[] = [];

      for (const node of nodes) {
          // If a node becomes too volatile and highly resonant, it forms a cascade
          if (node.volatility > 0.8 && node.resonancePotential > 50.0) {
              const cascadeId = `cascade_${this.cascadeCounter++}`;

              const cascade: ResonanceCascade = {
                  id: cascadeId,
                  epicenter: { x: node.x, y: node.y, z: node.z },
                  magnitude: node.resonancePotential * node.volatility,
                  linkedNodesCount: node.harmonicLinks.length,
                  timeToDetonation: Math.max(10, Math.floor(100 - (node.volatility * 50)))
              };

              this.activeCascades.set(cascadeId, cascade);
              cascades.push(cascade);

              // Reset the node to simulate energy conversion into the cascade
              node.resonancePotential *= 0.1;
              node.volatility = 0.1;
          }
      }

      return cascades;
  }
}
