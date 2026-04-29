interface EchoNode {
    id: string;
    element: string;
    x: number;
    y: number;
    z: number;
    intensity: number;
}

interface ResonanceLink {
    sourceId: string;
    targetId: string;
    distance: number;
    strength: number;
}

export class ResonanceManager {
    private nodes: Map<string, EchoNode> = new Map();
    private activeLinks: Map<string, ResonanceLink> = new Map();
    private resonanceThreshold: number = 50.0;

    public registerNode(node: EchoNode): void {
        this.nodes.set(node.id, node);
        this.updateResonanceMatrix();
    }

    public unregisterNode(nodeId: string): void {
        this.nodes.delete(nodeId);
        this.updateResonanceMatrix();
    }

    public updateNodePosition(nodeId: string, x: number, y: number, z: number): void {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.x = x;
            node.y = y;
            node.z = z;
            this.updateResonanceMatrix();
        }
    }

    private updateResonanceMatrix(): void {
        const nodeArray = Array.from(this.nodes.values());
        const newLinks: Map<string, ResonanceLink> = new Map();

        for (let i = 0; i < nodeArray.length; i++) {
            for (let j = i + 1; j < nodeArray.length; j++) {
                const nodeA = nodeArray[i];
                const nodeB = nodeArray[j];

                if (nodeA.element === nodeB.element) continue;

                const distance = this.calculateDistance(nodeA, nodeB);

                if (distance <= this.resonanceThreshold) {
                    const linkId = this.generateLinkId(nodeA.id, nodeB.id);
                    const strength = (1 - (distance / this.resonanceThreshold)) * ((nodeA.intensity + nodeB.intensity) / 2);
                    
                    newLinks.set(linkId, {
                        sourceId: nodeA.id,
                        targetId: nodeB.id,
                        distance,
                        strength
                    });
                }
            }
        }

        this.activeLinks = newLinks;
    }

    private calculateDistance(a: EchoNode, b: EchoNode): number {
        return Math.sqrt(
            Math.pow(b.x - a.x, 2) +
            Math.pow(b.y - a.y, 2) +
            Math.pow(b.z - a.z, 2)
        );
    }

    private generateLinkId(id1: string, id2: string): string {
        return [id1, id2].sort().join("::");
    }

    public getActiveLinks(): ResonanceLink[] {
        return Array.from(this.activeLinks.values());
    }

    public getNodesInRange(nodeId: string): EchoNode[] {
        const source = this.nodes.get(nodeId);
        if (!source) return [];

        return Array.from(this.nodes.values()).filter(target => {
            if (target.id === nodeId) return false;
            return this.calculateDistance(source, target) <= this.resonanceThreshold;
        });
    }

    public setThreshold(value: number): void {
        this.resonanceThreshold = value;
        this.updateResonanceMatrix();
    }

    public clear(): void {
        this.nodes.clear();
        this.activeLinks.clear();
    }
}