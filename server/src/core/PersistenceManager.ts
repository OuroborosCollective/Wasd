import { db } from '../config/firebase.js';
import { CollectionReference, DocumentData } from 'firebase-admin/firestore';

export class PersistenceManager {
  private playersCollection: CollectionReference<DocumentData>;

  constructor() {
    this.playersCollection = db.collection('players');
  }

  async init() {
    // No-op for now
  }

  async save(data: any) {
    try {
      const batch = db.batch();
      for (const id in data) {
        const player = data[id];
        const docRef = this.playersCollection.doc(id);
        batch.set(docRef, {
          ...player,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();
      console.log(`Saved ${Object.keys(data).length} players to Firestore.`);
    } catch (err) {
      console.error('Failed to save persistence data to Firestore:', err);
    }
  }

  async load(): Promise<any> {
    try {
      const snapshot = await this.playersCollection.get();
      const data: any = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      console.log(`Loaded ${Object.keys(data).length} players from Firestore.`);
      return data;
    } catch (err) {
      console.error('Failed to load persistence data from Firestore:', err);
      return {};
    }
  }
}
