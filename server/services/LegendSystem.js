class LegendSystem {
    constructor() {
        this.nodes = new Map();
        this.minRequiredLevel = 133;
    }

    addNode(id, attributes = {}, requirements = []) {
        this.nodes.set(id, {
            id,
            attributes,
            requirements,
            children: []
        });
    }

    addPath(fromId, toId) {
        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
            throw new Error("Node not found");
        }

        const node = this.nodes.get(fromId);
        node.children.push(toId);

        if (this.hasCycle()) {
            node.children.pop();
            throw new Error("Action rejected: Cycle detected in Legend System DAG");
        }
    }

    hasCycle() {
        const visited = new Set();
        const recStack = new Set();

        for (const nodeId of this.nodes.keys()) {
            if (this.detectCycleDFS(nodeId, visited, recStack)) {
                return true;
            }
        }
        return false;
    }

    detectCycleDFS(nodeId, visited, recStack) {
        if (!visited.has(nodeId)) {
            visited.add(nodeId);
            recStack.add(nodeId);

            const node = this.nodes.get(nodeId);
            for (const neighborId of node.children) {
                if (!visited.has(neighborId) && this.detectCycleDFS(neighborId, visited, recStack)) {
                    return true;
                } else if (recStack.has(neighborId)) {
                    return true;
                }
            }
        }
        recStack.delete(nodeId);
        return false;
    }

    canUnlockNode(nodeId, playerLevel, unlockedNodeIds) {
        if (playerLevel < this.minRequiredLevel) {
            return false;
        }

        const node = this.nodes.get(nodeId);
        if (!node) return false;

        if (node.requirements.length === 0) return true;

        return node.requirements.every(reqId => unlockedNodeIds.includes(reqId));
    }

    calculateBonuses(unlockedNodeIds) {
        const totalBonuses = {
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            vitality: 0,
            attackPower: 0,
            defense: 0
        };

        unlockedNodeIds.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            if (node && node.attributes) {
                for (const [attr, value] of Object.entries(node.attributes)) {
                    if (totalBonuses.hasOwnProperty(attr)) {
                        totalBonuses[attr] += value;
                    }
                }
            }
        });

        return totalBonuses;
    }

    getTraversableNodes(unlockedNodeIds) {
        const reachable = new Set();
        
        unlockedNodeIds.forEach(id => {
            const node = this.nodes.get(id);
            if (node) {
                node.children.forEach(childId => {
                    if (!unlockedNodeIds.includes(childId)) {
                        reachable.add(childId);
                    }
                });
            }
        });

        return Array.from(reachable).filter(nodeId => {
            const node = this.nodes.get(nodeId);
            return node.requirements.every(reqId => unlockedNodeIds.includes(reqId));
        });
    }
}

module.exports = new LegendSystem();