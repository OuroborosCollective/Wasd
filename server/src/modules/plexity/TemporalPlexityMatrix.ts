export interface TemporalNode {
  x: number;
  y: number;
  z: number;
  dilationFactor: number;
  playerDensity: number;
  echoPotential: number;
}

export class TemporalPlexityMatrix {
  private matrix: Map<string, TemporalNode> = new Map();
  private readonly CELL_SIZE = 10;

  public updatePlayerPositions(players: { id: string, x: number, y: number, z: number }[]): void {
    // Decay old echo potentials
    for (const [key, node] of this.matrix.entries()) {
      node.playerDensity = 0;
      node.echoPotential *= 0.95; // 5% decay per tick
      if (node.echoPotential < 0.01 && node.dilationFactor === 1.0) {
        this.matrix.delete(key);
      }
    }

    // Process new player positions
    for (const p of players) {
      const cx = Math.floor(p.x / this.CELL_SIZE);
      const cy = Math.floor(p.y / this.CELL_SIZE);
      const cz = Math.floor(p.z / this.CELL_SIZE);
      const key = `${cx},${cy},${cz}`;

      let node = this.matrix.get(key);
      if (!node) {
        node = { x: cx * this.CELL_SIZE, y: cy * this.CELL_SIZE, z: cz * this.CELL_SIZE, dilationFactor: 1.0, playerDensity: 0, echoPotential: 0 };
        this.matrix.set(key, node);
      }

      node.playerDensity++;
      node.echoPotential += 0.1; // Increase potential based on activity

      // Calculate dilation based on density and potential
      node.dilationFactor = 1.0 - Math.min(0.8, (node.playerDensity * 0.05) + (node.echoPotential * 0.02));
    }
  }

  public getMatrixState(): TemporalNode[] {
    return Array.from(this.matrix.values());
  }
}
