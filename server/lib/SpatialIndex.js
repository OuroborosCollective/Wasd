class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

class BoundingBox {
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    contains(x, y) {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    }

    intersects(other) {
        return !(other.minX > this.maxX || 
                 other.maxX < this.minX || 
                 other.minY > this.maxY || 
                 other.maxY < this.minY);
    }
}

class RTreeNode {
    constructor(isLeaf = true) {
        this.isLeaf = isLeaf;
        this.bounds = null;
        this.children = []; // Node or Entity
    }

    updateBounds() {
        if (this.children.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const child of this.children) {
            const b = child.bounds || { minX: child.pos.x, minY: child.pos.y, maxX: child.pos.x, maxY: child.pos.y };
            minX = Math.min(minX, b.minX);
            minY = Math.min(minY, b.minY);
            maxX = Math.max(maxX, b.maxX);
            maxY = Math.max(maxY, b.maxY);
        }
        this.bounds = new BoundingBox(minX, minY, maxX, maxY);
    }
}

class SpatialIndex {
    constructor(originLat, originLon) {
        this.originLat = originLat;
        this.originLon = originLon;
        this.earthRadius = 6371000; // Meters
        this.root = new RTreeNode(true);
        this.maxChildren = 16;
    }

    gpsToLocal(lat, lon, alt = 0) {
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;
        const originLatRad = (this.originLat * Math.PI) / 180;
        const originLonRad = (this.originLon * Math.PI) / 180;

        const x = this.earthRadius * (lonRad - originLonRad) * Math.cos(originLatRad);
        const y = this.earthRadius * (latRad - originLatRad);
        const z = alt;

        return new Vector3(x, y, z);
    }

    insert(logicGate) {
        const pos = this.gpsToLocal(logicGate.lat, logicGate.lon, logicGate.alt || 0);
        logicGate.pos = pos;
        this._insert(this.root, logicGate);
    }

    _insert(node, entity) {
        if (node.isLeaf) {
            node.children.push(entity);
            node.updateBounds();
            if (node.children.length > this.maxChildren) {
                this._split(node);
            }
        } else {
            // Simplified: always insert into the first child for basic R-Tree behavior
            // Real R-Tree would find child with least area expansion
            this._insert(node.children[0], entity);
            node.updateBounds();
        }
    }

    _split(node) {
        const mid = Math.floor(node.children.length / 2);
        const newNode = new RTreeNode(node.isLeaf);
        newNode.children = node.children.splice(mid);
        
        node.updateBounds();
        newNode.updateBounds();

        if (node === this.root) {
            const newRoot = new RTreeNode(false);
            newRoot.children.push(node, newNode);
            newRoot.updateBounds();
            this.root = newRoot;
        }
    }

    queryRadius(lat, lon, radius) {
        const center = this.gpsToLocal(lat, lon);
        const results = [];
        const queryBounds = new BoundingBox(
            center.x - radius, 
            center.y - radius, 
            center.x + radius, 
            center.y + radius
        );

        this._search(this.root, queryBounds, center, radius, results);
        return results;
    }

    _search(node, queryBounds, center, radius, results) {
        if (!node.bounds || !node.bounds.intersects(queryBounds)) {
            return;
        }

        if (node.isLeaf) {
            for (const entity of node.children) {
                if (entity.pos.distanceTo(center) <= radius) {
                    results.push(entity);
                }
            }
        } else {
            for (const child of node.children) {
                this._search(child, queryBounds, center, radius, results);
            }
        }
    }
}

module.exports = { SpatialIndex, Vector3, BoundingBox };