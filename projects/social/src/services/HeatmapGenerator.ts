interface DiscoursePoint {
    x: number;
    y: number;
    resonance: number;
    toxicity: number;
    metadata?: Record<string, any>;
}

interface HeatmapCoordinate {
    x: number;
    y: number;
    intensity: number;
}

interface ToxicCluster {
    centerX: number;
    centerY: number;
    radius: number;
    averageToxicity: number;
    pointCount: number;
    associatedIndices: number[];
}

export class HeatmapGenerator {
    private readonly gridResolution: number = 100;

    public generateHeatmap(data: DiscoursePoint[]): HeatmapCoordinate[] {
        if (data.length === 0) return [];

        const heatmap: Map<string, number> = new Map();

        data.forEach(point => {
            const gridX = Math.round(point.x * this.gridResolution) / this.gridResolution;
            const gridY = Math.round(point.y * this.gridResolution) / this.gridResolution;
            const key = `${gridX},${gridY}`;

            const currentResonance = heatmap.get(key) || 0;
            heatmap.set(key, currentResonance + point.resonance);
        });

        return Array.from(heatmap.entries()).map(([key, intensity]) => {
            const [x, y] = key.split(',').map(Number);
            return { x, y, intensity };
        });
    }

    public identifyToxicClusters(
        data: DiscoursePoint[], 
        toxicityThreshold: number = 0.7, 
        minClusterSize: number = 3,
        epsilon: number = 0.1
    ): ToxicCluster[] {
        const toxicPoints = data
            .map((p, index) => ({ ...p, originalIndex: index }))
            .filter(p => p.toxicity >= toxicityThreshold);

        const clusters: number[][] = [];
        const visited = new Set<number>();

        for (let i = 0; i < toxicPoints.length; i++) {
            if (visited.has(i)) continue;

            const currentCluster: number[] = [];
            const queue = [i];
            visited.add(i);

            while (queue.length > 0) {
                const currentIndex = queue.shift()!;
                currentCluster.push(currentIndex);

                for (let j = 0; j < toxicPoints.length; j++) {
                    if (visited.has(j)) continue;

                    const dist = this.calculateDistance(toxicPoints[currentIndex], toxicPoints[j]);
                    if (dist <= epsilon) {
                        visited.add(j);
                        queue.push(j);
                    }
                }
            }

            if (currentCluster.length >= minClusterSize) {
                clusters.push(currentCluster);
            }
        }

        return clusters.map(clusterIndices => {
            const pointsInCluster = clusterIndices.map(idx => toxicPoints[idx]);
            const sumX = pointsInCluster.reduce((acc, p) => acc + p.x, 0);
            const sumY = pointsInCluster.reduce((acc, p) => acc + p.y, 0);
            const sumTox = pointsInCluster.reduce((acc, p) => acc + p.toxicity, 0);
            
            const centerX = sumX / pointsInCluster.length;
            const centerY = sumY / pointsInCluster.length;

            let maxDist = 0;
            pointsInCluster.forEach(p => {
                const d = this.calculateDistance({ x: centerX, y: centerY }, p);
                if (d > maxDist) maxDist = d;
            });

            return {
                centerX,
                centerY,
                radius: maxDist,
                averageToxicity: sumTox / pointsInCluster.length,
                pointCount: pointsInCluster.length,
                associatedIndices: pointsInCluster.map(p => p.originalIndex)
            };
        });
    }

    private calculateDistance(p1: { x: number, y: number }, p2: { x: number, y: number }): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    public normalizeResonance(data: DiscoursePoint[]): DiscoursePoint[] {
        if (data.length === 0) return [];
        const maxResonance = Math.max(...data.map(p => p.resonance));
        if (maxResonance === 0) return data;

        return data.map(p => ({
            ...p,
            resonance: p.resonance / maxResonance
        }));
    }
}