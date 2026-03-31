import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../../core/PersistenceManager.js';
import { AssetPoolResolver, type AssetCategory, type AssetResolveInput } from './AssetPoolResolver.js';

export interface WorldObject {
  id: string;
  type: string; // e.g., "house", "dungeon", "tree", "well"
  name: string;
  position: { x: number, y: number };
  rotation?: number;
  scale?: number;
  assetCategory?: AssetCategory;
  assetKey?: string;
  variant?: string;
  glbPath?: string;
}

export class WorldObjectSystem {
  private objects: Map<string, WorldObject> = new Map();
  private dataPath: string;
  private persistence: PersistenceManager | null = null;
  private assetPoolResolver: AssetPoolResolver;

  constructor(persistence?: PersistenceManager, resolver?: AssetPoolResolver) {
    this.persistence = persistence || null;
    this.assetPoolResolver = resolver || new AssetPoolResolver();
    this.dataPath = path.resolve(process.cwd(), "game-data/world/objects.json");
    this.load();
  }

  public resolveObjectAsset(input: AssetResolveInput): string | undefined {
    return this.assetPoolResolver.resolveObject(input);
  }

  public async addObject(obj: WorldObject) {
    if (!obj.glbPath) {
      obj.glbPath = this.assetPoolResolver.resolveObject({
        assetCategory: obj.assetCategory || "prop",
        assetKey: obj.assetKey || obj.type,
        variant: obj.variant,
      });
    }
    this.objects.set(obj.id, obj);
    await this.save();
  }

  public async removeObject(id: string) {
    this.objects.delete(id);
    await this.save();
  }

  public getAllObjects(): WorldObject[] {
    return Array.from(this.objects.values());
  }

  public assignMissingGlbPaths() {
    let mutated = false;
    for (const object of this.objects.values()) {
      if (!object.glbPath) {
        const resolved = this.assetPoolResolver.resolveObject({
          assetCategory: object.assetCategory || "prop",
          assetKey: object.assetKey || object.type,
          variant: object.variant,
        });
        if (resolved) {
          object.glbPath = resolved;
          mutated = true;
        }
      }
    }
    return mutated;
  }

  public get objectsMap(): Map<string, WorldObject> {
    return this.objects;
  }

  public async clearObjects() {
    this.objects.clear();
    await this.save();
  }

  private async load() {
    // 1. Try Firestore first if available
    if (this.persistence) {
      const firestoreObjects = await this.persistence.loadWorldObjects();
      if (firestoreObjects && firestoreObjects.length > 0) {
        for (const obj of firestoreObjects) {
          this.objects.set(obj.id, obj);
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
        }
      }
    } catch (e) {
      console.error("Failed to load world objects from file", e);
    }
  }

  private async save() {
    // 1. Save to Firestore if available
    if (this.persistence) {
      await this.persistence.saveWorldObjects(this.getAllObjects());
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
