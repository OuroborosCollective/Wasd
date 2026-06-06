import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../../core/PersistenceManager.js';
import { resolveContentFile } from '../content/contentDataRoot.js';
import { ChunkSystem } from './ChunkSystem.js';

export interface WorldObject {
  id: string;
  type: string; // e.g., "house", "dungeon", "tree", "well"
  name: string;
  position: { x: number, y: number };
  rotation?: number;
  scale?: number;
  glbPath?: string;
}

export class WorldObjectSystem {
  private objects: Map<string, WorldObject> = new Map();
  private spatialIndex: Map<string, WorldObject[]> = new Map();
  private dataPath: string;
  private persistence: PersistenceManager | null = null;
  private chunkSystem: ChunkSystem;

  constructor(persistence?: PersistenceManager, chunkSystem?: ChunkSystem) {
    this.persistence = persistence || null;
    this.chunkSystem = chunkSystem || new ChunkSystem(64);
    this.dataPath = resolveContentFile("world/objects.json");
    this.load();
  }

  public async addObject(obj: WorldObject) {
    const existing = this.objects.get(obj.id);
    if (existing) {
      this.removeFromSpatialIndex(existing);
    }
    this.objects.set(obj.id, obj);
    this.addToSpatialIndex(obj);
    await this.save();
  }

  public async removeObject(id: string) {
    const obj = this.objects.get(id);
    if (obj) {
      this.removeFromSpatialIndex(obj);
      this.objects.delete(id);
      await this.save();
    }
  }

  public getAllObjects(): WorldObject[] {
    return Array.from(this.objects.values());
  }


  public getObjectsMap(): Map<string, WorldObject> {
    return this.objects;
  }

  public getObjectsInChunk(chunkId: string): WorldObject[] {
    return this.spatialIndex.get(chunkId) || [];
  }

  private getChunkId(x: number, y: number): string {
    return this.chunkSystem.getChunkId(x, y);
  }

  private addToSpatialIndex(obj: WorldObject) {
    const chunkId = this.getChunkId(obj.position.x, obj.position.y);
    let list = this.spatialIndex.get(chunkId);
    if (!list) {
      list = [];
      this.spatialIndex.set(chunkId, list);
    }
    list.push(obj);
  }

  private removeFromSpatialIndex(obj: WorldObject) {
    const chunkId = this.getChunkId(obj.position.x, obj.position.y);
    const list = this.spatialIndex.get(chunkId);
    if (list) {
      const idx = list.findIndex(o => o.id === obj.id);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      if (list.length === 0) {
        this.spatialIndex.delete(chunkId);
      }
    }
  }

  public async clearObjects() {
    this.objects.clear();
    this.spatialIndex.clear();
    await this.save();
  }

  private async load() {
    // 1. Try persistence backend first if available
    if (this.persistence) {
      const persistedObjects = await this.persistence.loadWorldObjects();
      if (persistedObjects && persistedObjects.length > 0) {
        for (const obj of persistedObjects) {
          this.objects.set(obj.id, obj);
          this.addToSpatialIndex(obj);
        }
        return;
      }
    }

    // 2. Fallback to local file
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, "utf-8"));
        for (const obj of data) {
          this.objects.set(obj.id, obj);
          this.addToSpatialIndex(obj);
        }
      }
    } catch (e) {
      console.error("Failed to load world objects from file", e);
    }
  }

  private async save() {
    // 1. Save to persistence backend if available
    if (this.persistence) {
      // Cast to Record<string, unknown> for compatibility
      await this.persistence.saveWorldObjects(
        this.getAllObjects() as unknown as readonly Record<string, unknown>[]
      );
    }

    // 2. Always save to local file as backup/local dev
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.getAllObjects(), null, 2));
    } catch (e) {
      console.error("Failed to save world objects to file", e);
    }
  }
}
