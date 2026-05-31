export interface SwarmData {
  swarmId: string;
  density: number; // Entities per sq unit
  center: { x: number; y: number; z: number };
  radius: number;
  physicsThreatLevel: number; // 0.0 to 1.0
}

function stableSwarmId(cellKey: string, counter: number): string {
  return `swarm_${counter}_${cellKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export class ChronoSwarmBrain {
  private activeSwarms: Map<string, SwarmData> = new Map();
  private readonly CRITICAL_DENSITY_THRESHOLD = 50; // entities per sq unit

  /**
   * Processes entity positions to identify hyper-dense clusters that might crash physics.
   */
  public analyzeSpatialDistribution(entities: { id: string; x: number; y: number; z: number }[]): SwarmData[] {
    // Highly simplified clustering logic for performance
    const grid: Map<string, number> = new Map();
    const cellSize = 10;

    for (const entity of entities) {
        const cx = Math.floor(entity.x / cellSize);
        const cy = Math.floor(entity.y / cellSize);
        const cz = Math.floor(entity.z / cellSize);
        const key = `${cx},${cy},${cz}`;
        grid.set(key, (grid.get(key) || 0) + 1);
    }

    this.activeSwarms.clear();
    let swarmCounter = 0;

    for (const [key, count] of [...grid.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))) {
        const density = count / (cellSize * cellSize * cellSize);

        // If density represents a physics threat
        if (density * 100 > this.CRITICAL_DENSITY_THRESHOLD) {
            const [cx, cy, cz] = key.split(',').map(Number);

            const swarm: SwarmData = {
                swarmId: stableSwarmId(key, swarmCounter++),
                density: density * 100,
                center: {
                    x: (cx * cellSize) + (cellSize / 2),
                    y: (cy * cellSize) + (cellSize / 2),
                    z: (cz * cellSize) + (cellSize / 2)
                },
                radius: cellSize * 1.5,
                physicsThreatLevel: Math.min(1.0, (density * 100) / (this.CRITICAL_DENSITY_THRESHOLD * 2))
            };
            this.activeSwarms.set(swarm.swarmId, swarm);
        }
    }

    return Array.from(this.activeSwarms.values());
  }
}