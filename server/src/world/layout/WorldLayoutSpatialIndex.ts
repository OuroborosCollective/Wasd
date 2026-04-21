/**
 * WorldLayoutSpatialIndex - Spatial hash grid for efficient proximity queries.
 *
 * Supports AABB collision checks, nearest-neighbor searches, and
 * radius-based queries for layout validation.
 */

import type { SpatialEntity } from "./WorldLayoutTypes.js";

interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Get the axis-aligned bounding box for an entity considering its footprint and rotation.
 */
export function getEntityAABB(entity: SpatialEntity): AABB {
  const fp = entity.footprint;
  const rot = entity.rotation ?? 0;
  const scale = entity.scale ?? 1;
  const halfW = (fp.width * scale) / 2;
  const halfD = (fp.depth * scale) / 2;

  // For simplicity, use axis-aligned bounding box
  // (rotation-aware AABB would use cos/sin, but this is sufficient for layout checks)
  const cx = entity.position.x;
  const cy = entity.position.y;

  // If rotation is near 90/270 degrees, swap width/depth
  const normRot = ((rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const isRotated90 = normRot > Math.PI * 0.25 && normRot < Math.PI * 0.75 ||
                       normRot > Math.PI * 1.25 && normRot < Math.PI * 1.75;

  const hw = isRotated90 ? halfD : halfW;
  const hd = isRotated90 ? halfW : halfD;

  return {
    minX: cx - hw,
    minY: cy - hd,
    maxX: cx + hw,
    maxY: cy + hd,
  };
}

/**
 * Check if two AABBs overlap.
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * Distance between two points.
 */
export function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * AABB center.
 */
export function aabbCenter(a: AABB): { x: number; y: number } {
  return { x: (a.minX + a.maxX) / 2, y: (a.minY + a.maxY) / 2 };
}

/**
 * AABB width/height.
 */
export function aabbSize(a: AABB): { w: number; h: number } {
  return { w: a.maxX - a.minX, h: a.maxY - a.minY };
}

/**
 * Distance between two AABBs (0 if overlapping).
 */
export function aabbDistance(a: AABB, b: AABB): number {
  const dx = Math.max(0, Math.max(b.minX - a.maxX, a.minX - b.maxX));
  const dy = Math.max(0, Math.max(b.minY - a.maxY, a.minY - b.maxY));
  return Math.hypot(dx, dy);
}

export class WorldLayoutSpatialIndex {
  /** Cell size for the spatial hash */
  private readonly cellSize: number;
  /** Map from cell key to entity ids */
  private readonly cells = new Map<string, Set<string>>();
  /** Map from entity id to entity */
  private readonly entities = new Map<string, SpatialEntity>();
  /** Map from entity id to occupied cells */
  private readonly entityCells = new Map<string, string[]>();

  constructor(cellSize = 32) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  private getCellsForAABB(aabb: AABB): string[] {
    const minCX = Math.floor(aabb.minX / this.cellSize);
    const minCY = Math.floor(aabb.minY / this.cellSize);
    const maxCX = Math.floor(aabb.maxX / this.cellSize);
    const maxCY = Math.floor(aabb.maxY / this.cellSize);
    const keys: string[] = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        keys.push(this.cellKey(cx, cy));
      }
    }
    return keys;
  }

  /**
   * Insert an entity into the spatial index.
   */
  insert(entity: SpatialEntity): void {
    this.remove(entity.id);
    this.entities.set(entity.id, entity);
    const aabb = getEntityAABB(entity);
    const cells = this.getCellsForAABB(aabb);
    this.entityCells.set(entity.id, cells);
    for (const key of cells) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key)!.add(entity.id);
    }
  }

  /**
   * Remove an entity from the index.
   */
  remove(id: string): void {
    const cells = this.entityCells.get(id);
    if (cells) {
      for (const key of cells) {
        this.cells.get(key)?.delete(id);
      }
    }
    this.entityCells.delete(id);
    this.entities.delete(id);
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.cells.clear();
    this.entities.clear();
    this.entityCells.clear();
  }

  /**
   * Query all entities whose AABB overlaps the given AABB.
   */
  queryAABB(aabb: AABB): SpatialEntity[] {
    const cellKeys = this.getCellsForAABB(aabb);
    const seen = new Set<string>();
    const results: SpatialEntity[] = [];
    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (!cell) continue;
      for (const id of cell) {
        if (seen.has(id)) continue;
        seen.add(id);
        const entity = this.entities.get(id);
        if (entity && aabbOverlap(getEntityAABB(entity), aabb)) {
          results.push(entity);
        }
      }
    }
    return results;
  }

  /**
   * Query all entities within radius of a point.
   */
  queryRadius(x: number, y: number, radius: number): SpatialEntity[] {
    const aabb: AABB = {
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    };
    const candidates = this.queryAABB(aabb);
    return candidates.filter((e) => pointDistance(e.position, { x, y }) <= radius);
  }

  /**
   * Get all entities of a specific category.
   */
  queryByCategory(category: string): SpatialEntity[] {
    const results: SpatialEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.category === category) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Get entity by id.
   */
  get(id: string): SpatialEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities.
   */
  getAll(): SpatialEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get count of indexed entities.
   */
  get size(): number {
    return this.entities.size;
  }

  /**
   * Check if a position is occupied (any entity's AABB contains this point).
   */
  isPositionOccupied(x: number, y: number, excludeId?: string): boolean {
    const aabb: AABB = { minX: x, minY: y, maxX: x, maxY: y };
    const hits = this.queryAABB(aabb);
    return hits.some((e) => e.id !== excludeId);
  }
}
