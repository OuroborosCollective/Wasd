import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../config/firebase.js";
import type { CollectionReference, DocumentData } from "firebase-admin/firestore";
import { serializePlayerForPersistence } from "../modules/persistence/playerSnapshot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePlayersFilePath(): string {
  const fromEnv = process.env.PLAYER_SAVE_FILE?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "players.json"),
    path.resolve(cwd, "..", "data", "players.json"),
    path.join(__dirname, "..", "..", "data", "players.json"),
  ];
  return candidates[0];
}

export class PersistenceManager {
  private playersCollection: CollectionReference<DocumentData> | null = null;
  private worldObjectsCollection: CollectionReference<DocumentData> | null = null;
  private readonly playersFilePath: string;

  constructor() {
    this.playersFilePath = resolvePlayersFilePath();
  }

  private getCollection(name: "players" | "worldObjects") {
    if (name === "players") {
      if (this.playersCollection) return this.playersCollection;
      const firestore = getDb();
      if (firestore) {
        this.playersCollection = firestore.collection("players");
      }
      return this.playersCollection;
    }
    if (this.worldObjectsCollection) return this.worldObjectsCollection;
    const firestore = getDb();
    if (firestore) {
      this.worldObjectsCollection = firestore.collection("worldObjects");
    }
    return this.worldObjectsCollection;
  }

  async init() {
    if (!getDb()) {
      console.log(`[Persistence] Firestore disabled — using file player store: ${this.playersFilePath}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const firestore = getDb();
      if (!firestore) {
        return true;
      }
      await firestore.listCollections();
      return true;
    } catch (err) {
      console.error("Firestore connection test failed:", err);
      return false;
    }
  }

  async save(data: Record<string, any>) {
    const firestore = getDb();
    const collection = this.getCollection("players");
    if (firestore && collection) {
      try {
        const batch = firestore.batch();
        for (const id in data) {
          const player = data[id];
          const docRef = collection.doc(id);
          const payload = {
            ...serializePlayerForPersistence(player),
            lastUpdated: new Date().toISOString(),
          };
          batch.set(docRef, payload, { merge: true });
        }
        await batch.commit();
        console.log(`Saved ${Object.keys(data).length} players to Firestore.`);
      } catch (err) {
        console.error("Failed to save persistence data to Firestore:", err);
      }
      return;
    }

    try {
      const dir = path.dirname(this.playersFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, unknown> = {};
      for (const id in data) {
        serializable[id] = {
          ...serializePlayerForPersistence(data[id]),
          lastUpdated: new Date().toISOString(),
        };
      }
      fs.writeFileSync(this.playersFilePath, JSON.stringify(serializable, null, 2), "utf-8");
      console.log(`Saved ${Object.keys(data).length} players to ${this.playersFilePath}.`);
    } catch (err) {
      console.error("Failed to save players to file:", err);
    }
  }

  async load(): Promise<Record<string, any>> {
    const collection = this.getCollection("players");
    if (collection) {
      try {
        const snapshot = await collection.get();
        const data: Record<string, any> = {};
        snapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        console.log(`Loaded ${Object.keys(data).length} players from Firestore.`);
        return data;
      } catch (err) {
        console.error("Failed to load persistence data from Firestore:", err);
        return {};
      }
    }

    try {
      if (!fs.existsSync(this.playersFilePath)) {
        console.log(`[Persistence] No player save file yet (${this.playersFilePath}).`);
        return {};
      }
      const raw = fs.readFileSync(this.playersFilePath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, any>;
      const count = Object.keys(parsed).length;
      console.log(`Loaded ${count} players from ${this.playersFilePath}.`);
      return parsed;
    } catch (err) {
      console.error("Failed to load players from file:", err);
      return {};
    }
  }

  async saveWorldObjects(objects: any[]) {
    try {
      const firestore = getDb();
      const collection = this.getCollection("worldObjects");
      if (!firestore || !collection) {
        console.warn("Firestore not available, skipping save world objects.");
        return;
      }
      const batch = firestore.batch();
      for (const obj of objects) {
        const docRef = collection.doc(obj.id);
        batch.set(
          docRef,
          {
            ...obj,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      await batch.commit();
      console.log(`Saved ${objects.length} world objects to Firestore.`);
    } catch (err) {
      console.error("Failed to save world objects to Firestore:", err);
    }
  }

  async loadWorldObjects(): Promise<any[]> {
    try {
      const collection = this.getCollection("worldObjects");
      if (!collection) {
        console.warn("Firestore not available, skipping load world objects.");
        return [];
      }
      const snapshot = await collection.get();
      const objects: any[] = [];
      snapshot.forEach((doc) => {
        objects.push(doc.data());
      });
      console.log(`Loaded ${objects.length} world objects from Firestore.`);
      return objects;
    } catch (err) {
      console.error("Failed to load world objects from Firestore:", err);
      return [];
    }
  }
}
