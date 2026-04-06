import type { CollectionReference, DocumentData } from "firebase-admin/firestore";
import { getDb } from "../../config/firebase.js";
import { serializePlayerForPersistence } from "./playerSnapshot.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";

export class FirestorePersistenceBackend implements IPersistenceBackend {
  readonly name = "firestore";
  private playersCollection: CollectionReference<DocumentData> | null = null;
  private worldObjectsCollection: CollectionReference<DocumentData> | null = null;

  private getCollection(name: "players" | "worldObjects"): CollectionReference<DocumentData> | null {
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

  async init(): Promise<void> {
    if (!getDb()) {
      console.warn("[Persistence] Firestore backend selected but getDb() is null.");
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

  async save(data: Record<string, any>): Promise<void> {
    const firestore = getDb();
    const collection = this.getCollection("players");
    if (!firestore || !collection) {
      console.error("[Persistence] Firestore save skipped (no DB).");
      return;
    }
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
  }

  async load(): Promise<Record<string, any>> {
    const collection = this.getCollection("players");
    if (!collection) {
      return {};
    }
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

  async saveWorldObjects(objects: any[]): Promise<void> {
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
