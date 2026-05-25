export interface AetherNode {
  x: number;
  y: number;
  z: number;
  resonancePotential: number;
  volatility: number;
  harmonicLinks: string[]; // IDs of linked nodes
}

export class AetherResonanceField {
  private grid: Map<string, AetherNode> = new Map();
  private readonly NODE_SPACING = 20;

  public injectAetherEnergy(x: number, y: number, z: number, energy: number): void {
      const cx = Math.floor(x / this.NODE_SPACING);
      const cy = Math.floor(y / this.NODE_SPACING);
      const cz = Math.floor(z / this.NODE_SPACING);
      const key = `${cx},${cy},${cz}`;

      let node = this.grid.get(key);
      if (!node) {
          node = {
            x: cx * this.NODE_SPACING,
            y: cy * this.NODE_SPACING,
            z: cz * this.NODE_SPACING,
            resonancePotential: 0,
            volatility: 0.1,
            harmonicLinks: []
          };
          this.grid.set(key, node);
      }

      node.resonancePotential += energy;
      node.volatility = Math.min(1.0, node.volatility + (energy * 0.05));
  }

  public calculateHarmonics(): AetherNode[] {
      const nodes = Array.from(this.grid.values());

      // Calculate resonance spreading and link formation
      for (const node of nodes) {
          if (node.resonancePotential > 10.0) {
              // Find nearby nodes to link and spread energy
              for (const other of nodes) {
                  if (node === other) continue;

                  const dist = Math.sqrt(
                      Math.pow(node.x - other.x, 2) +
                      Math.pow(node.y - other.y, 2) +
                      Math.pow(node.z - other.z, 2)
                  );

                  if (dist < this.NODE_SPACING * 2.5) {
                      const linkId = `${other.x},${other.y},${other.z}`;
                      if (!node.harmonicLinks.includes(linkId)) {
                        node.harmonicLinks.push(linkId);
                      }

                      // Transfer some resonance
                      const transfer = node.resonancePotential * 0.05;
                      node.resonancePotential -= transfer;
                      other.resonancePotential += transfer;
                  }
              }
          }
      }
      return nodes;
  }
}
