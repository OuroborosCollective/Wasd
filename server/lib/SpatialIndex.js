"use strict";

/**
 * Deterministic SpatialIndex for GPS-backed logic gates and local MMO proximity queries.
 *
 * ESM primary export because the repository/server package is type: module.
 * A CommonJS compatibility copy lives at SpatialIndex.cjs.
 *
 * Entity shape:
 * {
 *   id: string,
 *   lat: number,
 *   lon?: number,
 *   lng?: number,
 *   alt?: number
 * }
 */

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = assertFiniteNumber(x, "Vector3.x");
    this.y = assertFiniteNumber(y, "Vector3.y");
    this.z = assertFiniteNumber(z, "Vector3.z");
    Object.freeze(this);
  }

  distanceSquaredTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  distanceTo(v) {
    return Math.sqrt(this.distanceSquaredTo(v));
  }

  toJSON() {
    return { x: this.x, y: this.y, z: this.z };
  }
}

export class BoundingBox {
  constructor(minX, minY, maxX, maxY) {
    this.minX = assertFiniteNumber(minX, "BoundingBox.minX");
    this.minY = assertFiniteNumber(minY, "BoundingBox.minY");
    this.maxX = assertFiniteNumber(maxX, "BoundingBox.maxX");
    this.maxY = assertFiniteNumber(maxY, "BoundingBox.maxY");

    if (this.minX > this.maxX) throw new Error("INVALID_BOUNDS_X");
    if (this.minY > this.maxY) throw new Error("INVALID_BOUNDS_Y");

    Object.freeze(this);
  }

  static fromPoint(x, y) {
    return new BoundingBox(x, y, x, y);
  }

  static union(a, b) {
    if (!a) return b;
    if (!b) return a;
    return new BoundingBox(
      Math.min(a.minX, b.minX),
      Math.min(a.minY, b.minY),
      Math.max(a.maxX, b.maxX),
      Math.max(a.maxY, b.maxY)
    );
  }

  contains(x, y) {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }

  intersects(other) {
    return !(
      other.minX > this.maxX ||
      other.maxX < this.minX ||
      other.minY > this.maxY ||
      other.maxY < this.minY
    );
  }

  area() {
    return Math.max(0, this.maxX - this.minX) * Math.max(0, this.maxY - this.minY);
  }

  enlargementNeeded(other) {
    return BoundingBox.union(this, other).area() - this.area();
  }

  centerX() {
    return (this.minX + this.maxX) * 0.5;
  }

  centerY() {
    return (this.minY + this.maxY) * 0.5;
  }

  width() {
    return this.maxX - this.minX;
  }

  height() {
    return this.maxY - this.minY;
  }

  distanceSquaredToPoint(x, y) {
    let dx = 0;
    let dy = 0;

    if (x < this.minX) dx = this.minX - x;
    else if (x > this.maxX) dx = x - this.maxX;

    if (y < this.minY) dy = this.minY - y;
    else if (y > this.maxY) dy = y - this.maxY;

    return dx * dx + dy * dy;
  }

  toJSON() {
    return { minX: this.minX, minY: this.minY, maxX: this.maxX, maxY: this.maxY };
  }
}

class RTreeNode {
  constructor(isLeaf = true) {
    this.isLeaf = Boolean(isLeaf);
    this.bounds = null;
    this.children = [];
  }

  updateBounds() {
    if (this.children.length === 0) {
      this.bounds = null;
      return;
    }

    let bounds = null;
    for (const child of this.children) {
      bounds = BoundingBox.union(bounds, getChildBounds(child));
    }
    this.bounds = bounds;
  }

  sortChildrenDeterministically() {
    this.children.sort(compareSpatialChildren);
  }
}

export class SpatialIndex {
  constructor(originLat, originLon, options = {}) {
    this.originLat = assertLatitude(originLat, "originLat");
    this.originLon = assertLongitude(originLon, "originLon");
    this.earthRadius = assertPositiveNumber(options.earthRadius ?? 6371000, "earthRadius");
    this.maxChildren = assertIntegerInRange(options.maxChildren ?? 16, "maxChildren", 4, 128);
    this.minChildren = Math.max(2, Math.floor(this.maxChildren * 0.4));
    this.root = new RTreeNode(true);
    this.entities = new Map();
  }

  gpsToLocal(lat, lon, alt = 0) {
    lat = assertLatitude(lat, "lat");
    lon = assertLongitude(lon, "lon");
    alt = assertFiniteNumber(alt, "alt");

    const degToRad = Math.PI / 180;
    const originLatRad = this.originLat * degToRad;
    const originLonRad = this.originLon * degToRad;
    const latRad = lat * degToRad;
    const lonRad = lon * degToRad;

    return new Vector3(
      this.earthRadius * (lonRad - originLonRad) * Math.cos(originLatRad),
      this.earthRadius * (latRad - originLatRad),
      alt
    );
  }

  insert(entity) {
    validateEntity(entity);
    if (this.entities.has(entity.id)) throw new Error(`ENTITY_ALREADY_INDEXED:${entity.id}`);

    const indexed = this._prepareEntity(entity);
    this.entities.set(indexed.id, indexed);

    const split = this._insert(this.root, indexed);
    if (split) {
      const newRoot = new RTreeNode(false);
      newRoot.children = [this.root, split];
      newRoot.sortChildrenDeterministically();
      newRoot.updateBounds();
      this.root = newRoot;
    }

    return indexed;
  }

  upsert(entity) {
    validateEntity(entity);
    if (this.entities.has(entity.id)) this.remove(entity.id);
    return this.insert(entity);
  }

  update(id, patch) {
    const current = this.entities.get(id);
    if (!current) return false;
    const next = { ...current, ...patch, id: current.id };
    delete next.__spatial;
    this.remove(id);
    this.insert(next);
    return true;
  }

  remove(id) {
    assertEntityId(id);
    if (!this.entities.has(id)) return false;

    const removed = this._removeFromNode(this.root, id);
    if (!removed) return false;

    this.entities.delete(id);
    this.root.updateBounds();

    while (!this.root.isLeaf && this.root.children.length === 1) {
      this.root = this.root.children[0];
    }

    if (this.root.children.length === 0) this.root = new RTreeNode(true);
    return true;
  }

  clear() {
    this.root = new RTreeNode(true);
    this.entities.clear();
  }

  size() {
    return this.entities.size;
  }

  queryRadius(lat, lon, radius, options = {}) {
    radius = assertPositiveNumber(radius, "radius");

    const includeAltitude = Boolean(options.includeAltitude ?? false);
    const limit = options.limit == null
      ? Infinity
      : assertIntegerInRange(options.limit, "limit", 1, Number.MAX_SAFE_INTEGER);

    const center = this.gpsToLocal(lat, lon, options.alt ?? 0);
    const radiusSquared = radius * radius;
    const queryBounds = new BoundingBox(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
    const results = [];

    this._searchRadius(this.root, queryBounds, center, radiusSquared, includeAltitude, results, limit);

    results.sort((a, b) => {
      const da = a.__spatial.pos.distanceSquaredTo(center);
      const db = b.__spatial.pos.distanceSquaredTo(center);
      if (da !== db) return da - db;
      return compareId(a.id, b.id);
    });

    return results.slice(0, limit);
  }

  queryBounds(minX, minY, maxX, maxY, limit = Infinity) {
    const bounds = new BoundingBox(minX, minY, maxX, maxY);
    const results = [];
    this._searchBounds(this.root, bounds, results, limit);
    results.sort(compareEntityByStableSpatialOrder);
    return results.slice(0, limit);
  }

  nearest(lat, lon, options = {}) {
    return this.queryRadius(lat, lon, options.radius ?? 1000, { ...options, limit: options.limit ?? 1 });
  }

  stats() {
    const out = {
      entities: this.entities.size,
      height: 0,
      nodes: 0,
      leafNodes: 0,
      internalNodes: 0,
      maxChildren: this.maxChildren,
      rootBounds: this.root.bounds ? this.root.bounds.toJSON() : null,
    };

    const walk = (node, depth) => {
      out.nodes += 1;
      out.height = Math.max(out.height, depth);
      if (node.isLeaf) out.leafNodes += 1;
      else out.internalNodes += 1;
      if (!node.isLeaf) for (const child of node.children) walk(child, depth + 1);
    };

    walk(this.root, 1);
    return out;
  }

  _prepareEntity(entity) {
    const lon = getEntityLon(entity);
    const pos = this.gpsToLocal(entity.lat, lon, entity.alt ?? 0);
    return {
      ...entity,
      lon,
      __spatial: {
        pos,
        bounds: BoundingBox.fromPoint(pos.x, pos.y),
      },
    };
  }

  _insert(node, entity) {
    if (node.isLeaf) {
      node.children.push(entity);
      node.sortChildrenDeterministically();
      node.updateBounds();
      return node.children.length > this.maxChildren ? this._splitNode(node) : null;
    }

    const target = this._chooseSubtree(node, entity.__spatial.bounds);
    const split = this._insert(target, entity);
    if (split) {
      node.children.push(split);
      node.sortChildrenDeterministically();
    }
    node.updateBounds();
    return node.children.length > this.maxChildren ? this._splitNode(node) : null;
  }

  _chooseSubtree(node, entityBounds) {
    let best = null;
    let bestEnlargement = Infinity;
    let bestArea = Infinity;
    let bestChildCount = Infinity;

    for (const child of node.children) {
      const bounds = child.bounds;
      const enlargement = bounds.enlargementNeeded(entityBounds);
      const area = bounds.area();
      const childCount = child.children.length;

      if (
        enlargement < bestEnlargement ||
        (enlargement === bestEnlargement && area < bestArea) ||
        (enlargement === bestEnlargement && area === bestArea && childCount < bestChildCount) ||
        (enlargement === bestEnlargement && area === bestArea && childCount === bestChildCount && compareSpatialChildren(child, best) < 0)
      ) {
        best = child;
        bestEnlargement = enlargement;
        bestArea = area;
        bestChildCount = childCount;
      }
    }

    return best;
  }

  _splitNode(node) {
    node.sortChildrenDeterministically();
    const splitByX = node.bounds.width() >= node.bounds.height();

    node.children.sort((a, b) => {
      const ab = getChildBounds(a);
      const bb = getChildBounds(b);
      const primary = splitByX ? ab.centerX() - bb.centerX() : ab.centerY() - bb.centerY();
      if (primary !== 0) return primary;
      const secondary = splitByX ? ab.centerY() - bb.centerY() : ab.centerX() - bb.centerX();
      if (secondary !== 0) return secondary;
      return compareSpatialChildren(a, b);
    });

    const splitIndex = Math.max(
      this.minChildren,
      Math.min(node.children.length - this.minChildren, Math.floor(node.children.length / 2))
    );

    const sibling = new RTreeNode(node.isLeaf);
    sibling.children = node.children.splice(splitIndex);
    node.sortChildrenDeterministically();
    sibling.sortChildrenDeterministically();
    node.updateBounds();
    sibling.updateBounds();
    return sibling;
  }

  _removeFromNode(node, id) {
    if (node.isLeaf) {
      const index = node.children.findIndex((entity) => entity.id === id);
      if (index === -1) return false;
      node.children.splice(index, 1);
      node.updateBounds();
      return true;
    }

    const entity = this.entities.get(id);
    if (!entity) return false;
    const entityBounds = entity.__spatial.bounds;

    for (const child of node.children) {
      if (!child.bounds || !child.bounds.intersects(entityBounds)) continue;
      if (this._removeFromNode(child, id)) {
        if (child.children.length === 0) {
          const index = node.children.indexOf(child);
          if (index >= 0) node.children.splice(index, 1);
        }
        node.updateBounds();
        return true;
      }
    }

    return false;
  }

  _searchRadius(node, queryBounds, center, radiusSquared, includeAltitude, results, limit) {
    if (results.length >= limit) return;
    if (!node.bounds || !node.bounds.intersects(queryBounds)) return;
    if (node.bounds.distanceSquaredToPoint(center.x, center.y) > radiusSquared) return;

    if (node.isLeaf) {
      for (const entity of node.children) {
        if (results.length >= limit) break;
        const pos = entity.__spatial.pos;
        const distSquared = includeAltitude
          ? pos.distanceSquaredTo(center)
          : (pos.x - center.x) * (pos.x - center.x) + (pos.y - center.y) * (pos.y - center.y);
        if (distSquared <= radiusSquared) results.push(entity);
      }
      return;
    }

    const orderedChildren = node.children.slice().sort((a, b) => {
      const da = a.bounds.distanceSquaredToPoint(center.x, center.y);
      const db = b.bounds.distanceSquaredToPoint(center.x, center.y);
      if (da !== db) return da - db;
      return compareSpatialChildren(a, b);
    });

    for (const child of orderedChildren) {
      this._searchRadius(child, queryBounds, center, radiusSquared, includeAltitude, results, limit);
    }
  }

  _searchBounds(node, bounds, results, limit) {
    if (results.length >= limit) return;
    if (!node.bounds || !node.bounds.intersects(bounds)) return;

    if (node.isLeaf) {
      for (const entity of node.children) {
        if (results.length >= limit) break;
        if (entity.__spatial.bounds.intersects(bounds)) results.push(entity);
      }
      return;
    }

    for (const child of node.children) this._searchBounds(child, bounds, results, limit);
  }
}

function getChildBounds(child) {
  if (child instanceof RTreeNode) return child.bounds;
  if (child?.__spatial?.bounds) return child.__spatial.bounds;
  if (child?.bounds) return child.bounds;
  if (child?.pos) return BoundingBox.fromPoint(child.pos.x, child.pos.y);
  throw new Error("CHILD_HAS_NO_BOUNDS");
}

function compareSpatialChildren(a, b) {
  if (a === b) return 0;
  if (!b) return -1;
  const ab = getChildBounds(a);
  const bb = getChildBounds(b);
  if (ab.minX !== bb.minX) return ab.minX - bb.minX;
  if (ab.minY !== bb.minY) return ab.minY - bb.minY;
  if (ab.maxX !== bb.maxX) return ab.maxX - bb.maxX;
  if (ab.maxY !== bb.maxY) return ab.maxY - bb.maxY;
  return compareId(a.id ?? "", b.id ?? "");
}

function compareEntityByStableSpatialOrder(a, b) {
  const ab = a.__spatial.bounds;
  const bb = b.__spatial.bounds;
  if (ab.minX !== bb.minX) return ab.minX - bb.minX;
  if (ab.minY !== bb.minY) return ab.minY - bb.minY;
  return compareId(a.id, b.id);
}

function compareId(a, b) {
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
}

function validateEntity(entity) {
  if (!entity || typeof entity !== "object") throw new Error("INVALID_ENTITY");
  assertEntityId(entity.id);
  assertLatitude(entity.lat, "entity.lat");
  getEntityLon(entity);
  if (entity.alt != null) assertFiniteNumber(entity.alt, "entity.alt");
}

function assertEntityId(id) {
  if (typeof id !== "string" || id.length === 0) throw new Error("INVALID_ENTITY_ID");
  return id;
}

function getEntityLon(entity) {
  const lon = entity.lon ?? entity.lng;
  return assertLongitude(lon, "entity.lon");
}

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`INVALID_NUMBER:${name}`);
  return value;
}

function assertPositiveNumber(value, name) {
  value = assertFiniteNumber(value, name);
  if (value <= 0) throw new Error(`INVALID_POSITIVE_NUMBER:${name}`);
  return value;
}

function assertIntegerInRange(value, name, min, max) {
  if (!Number.isInteger(value)) throw new Error(`INVALID_INTEGER:${name}`);
  if (value < min || value > max) throw new Error(`INTEGER_OUT_OF_RANGE:${name}`);
  return value;
}

function assertLatitude(value, name) {
  value = assertFiniteNumber(value, name);
  if (value < -90 || value > 90) throw new Error(`INVALID_LATITUDE:${name}`);
  return value;
}

function assertLongitude(value, name) {
  value = assertFiniteNumber(value, name);
  if (value < -180 || value > 180) throw new Error(`INVALID_LONGITUDE:${name}`);
  return value;
}

export default SpatialIndex;
