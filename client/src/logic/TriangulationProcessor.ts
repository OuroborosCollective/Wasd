export interface Vector2 {
    x: number;
    y: number;
}

export interface Node {
    id: string;
    position: Vector2;
}

export interface Edge {
    nodeA: string;
    nodeB: string;
}

export interface TriangulationExplosionEvent {
    type: 'TRIANGULATION_EXPLOSION';
    center: Vector2;
    consumedNodeIds: string[];
    burstDamage: number;
}

export type ExplosionCallback = (event: TriangulationExplosionEvent) => void;

export class TriangulationProcessor {
    private onExplosion: ExplosionCallback;
    private readonly BASE_BURST_DAMAGE = 100;

    constructor(explosionCallback: ExplosionCallback) {
        this.onExplosion = explosionCallback;
    }

    public process(nodes: Node[], edges: Edge[]): void {
        const adjacencyList = this.buildAdjacencyList(nodes, edges);
        const triangles = this.findThreeCycles(nodes, adjacencyList);

        if (triangles.length > 0) {
            for (const triangle of triangles) {
                const center = this.calculateGeometricCenter(triangle);
                const nodeIds = triangle.map(n => n.id);

                this.onExplosion({
                    type: 'TRIANGULATION_EXPLOSION',
                    center,
                    consumedNodeIds: nodeIds,
                    burstDamage: this.BASE_BURST_DAMAGE * 1.5
                });
            }
        }
    }

    private buildAdjacencyList(nodes: Node[], edges: Edge[]): Map<string, Set<string>> {
        const adj = new Map<string, Set<string>>();
        nodes.forEach(n => adj.set(n.id, new Set()));
        
        edges.forEach(e => {
            if (adj.has(e.nodeA) && adj.has(e.nodeB)) {
                adj.get(e.nodeA)!.add(e.nodeB);
                adj.get(e.nodeB)!.add(e.nodeA);
            }
        });
        return adj;
    }

    private findThreeCycles(nodes: Node[], adj: Map<string, Set<string>>): Node[][] {
        const triangles: Node[][] = [];
        const seen = new Set<string>();
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const sortedNodeIds = nodes.map(n => n.id).sort();

        for (let i = 0; i < sortedNodeIds.length; i++) {
            const idA = sortedNodeIds[i];
            const neighborsA = adj.get(idA) || new Set();

            for (let j = i + 1; j < sortedNodeIds.length; j++) {
                const idB = sortedNodeIds[j];
                if (!neighborsA.has(idB)) continue;

                const neighborsB = adj.get(idB) || new Set();

                for (let k = j + 1; k < sortedNodeIds.length; k++) {
                    const idC = sortedNodeIds[k];
                    
                    if (neighborsA.has(idC) && neighborsB.has(idC)) {
                        const triangleKey = [idA, idB, idC].sort().join(':');
                        if (!seen.has(triangleKey)) {
                            seen.add(triangleKey);
                            triangles.push([
                                nodeMap.get(idA)!,
                                nodeMap.get(idB)!,
                                nodeMap.get(idC)!
                            ]);
                        }
                    }
                }
            }
        }
        return triangles;
    }

    private calculateGeometricCenter(triangleNodes: Node[]): Vector2 {
        let sumX = 0;
        let sumY = 0;
        
        for (const node of triangleNodes) {
            sumX += node.position.x;
            sumY += node.position.y;
        }

        return {
            x: sumX / triangleNodes.length,
            y: sumY / triangleNodes.length
        };
    }
}