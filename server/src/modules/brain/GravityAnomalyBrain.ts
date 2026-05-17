export interface BrainCluster {
    x: number;
    y: number;
    count: number;
}

export interface AnomalySpawntent {
    id: string;
    x: number;
    y: number;
    radius: number;
    gravityModifier: number; // Low gravity (e.g., 0.5) to disrupt tight clusters
}

/**
 * GravityAnomalyBrain
 * Brain module that analyzes player clustering to intelligently spawn Gravity Flux Anomalies
 * where they disrupt large groups.
 */
export class GravityAnomalyBrain {
    private readonly CLUSTER_THRESHOLD = 5; // Min entities to trigger an anomaly
    private readonly GRID_CELL_SIZE = 100; // Size of analysis grid

    /**
     * Analyzes entity positions to find dense clusters.
     */
    public analyzeClustering(entities: { x: number, y: number }[]): BrainCluster[] {
        const grid: Map<string, BrainCluster> = new Map();

        for (const entity of entities) {
            const cellX = Math.floor(entity.x / this.GRID_CELL_SIZE);
            const cellY = Math.floor(entity.y / this.GRID_CELL_SIZE);
            const key = `${cellX},${cellY}`;

            if (grid.has(key)) {
                grid.get(key)!.count += 1;
            } else {
                // Calculate center of cell for cluster position
                grid.set(key, {
                    x: cellX * this.GRID_CELL_SIZE + (this.GRID_CELL_SIZE / 2),
                    y: cellY * this.GRID_CELL_SIZE + (this.GRID_CELL_SIZE / 2),
                    count: 1
                });
            }
        }

        const activeClusters: BrainCluster[] = [];
        for (const cluster of grid.values()) {
            if (cluster.count >= this.CLUSTER_THRESHOLD) {
                activeClusters.push(cluster);
            }
        }

        return activeClusters;
    }

    /**
     * Generates spawn intents for Gravity Anomalies based on current clusters.
     */
    public generateAnomalyIntents(clusters: BrainCluster[], currentTick: number): AnomalySpawntent[] {
        const intents: AnomalySpawntent[] = [];

        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];

            // Generate a deterministic ID based on tick and cluster position
            const intentId = `flux_anomaly_${currentTick}_${Math.floor(cluster.x)}_${Math.floor(cluster.y)}`;

            // Determine severity based on cluster density
            // Higher count -> stronger anomaly (lower gravity, more floaty disruption)
            let modifier = 0.8;
            if (cluster.count > 10) modifier = 0.5;
            if (cluster.count > 20) modifier = 0.2;

            intents.push({
                id: intentId,
                x: cluster.x,
                y: cluster.y,
                radius: this.GRID_CELL_SIZE * 1.5, // Affects the cell and surrounding area
                gravityModifier: modifier
            });
        }

        return intents;
    }
}
