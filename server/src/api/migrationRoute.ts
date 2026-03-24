import { Router } from 'express';
import { db as pgDb } from '../core/Database.js';
import { db as firestoreDb } from '../config/firebase.js';

const router = Router();

router.get('/migrate', async (req, res) => {
  try {
    console.log('Starting full migration from PostgreSQL to Firestore...');
    const results: any = {};

    // 1. Migrate Players
    const pgPlayers = await pgDb.query('SELECT * FROM players');
    if (pgPlayers.rows.length > 0) {
      const batch = firestoreDb.batch();
      const collection = firestoreDb.collection('players');
      for (const row of pgPlayers.rows) {
        const data = {
          ...row,
          position: { x: row.x || 0, y: row.y || 0, z: row.z || 0 },
          lastUpdated: new Date().toISOString(),
          migratedFromPg: true
        };
        // Clean up fields that are now in position map
        delete (data as any).x;
        delete (data as any).y;
        delete (data as any).z;
        
        const docRef = collection.doc(row.id || row.name);
        batch.set(docRef, data, { merge: true });
      }
      await batch.commit();
      results.players = pgPlayers.rows.length;
    }

    // 2. Migrate Land Plots
    const pgLand = await pgDb.query('SELECT * FROM land_plots');
    if (pgLand.rows.length > 0) {
      const batch = firestoreDb.batch();
      const collection = firestoreDb.collection('land_plots');
      for (const row of pgLand.rows) {
        const data = {
          ...row,
          ownerId: row.owner_id,
          ownerName: row.owner_name,
          claimedAt: row.claimed_at,
          migratedFromPg: true
        };
        delete (data as any).owner_id;
        delete (data as any).owner_name;
        delete (data as any).claimed_at;

        const docRef = collection.doc(row.id);
        batch.set(docRef, data, { merge: true });
      }
      await batch.commit();
      results.land_plots = pgLand.rows.length;
    }

    // 3. Migrate Nations
    const pgNations = await pgDb.query('SELECT * FROM nations');
    if (pgNations.rows.length > 0) {
      const batch = firestoreDb.batch();
      const collection = firestoreDb.collection('nations');
      for (const row of pgNations.rows) {
        const data = {
          ...row,
          leaderId: row.leader_id,
          createdAt: row.created_at,
          migratedFromPg: true
        };
        delete (data as any).leader_id;
        delete (data as any).created_at;

        const docRef = collection.doc(row.id);
        batch.set(docRef, data, { merge: true });
      }
      await batch.commit();
      results.nations = pgNations.rows.length;
    }

    // 4. Migrate World State
    const pgWorld = await pgDb.query('SELECT * FROM world_state');
    if (pgWorld.rows.length > 0) {
      const batch = firestoreDb.batch();
      const collection = firestoreDb.collection('world_state');
      for (const row of pgWorld.rows) {
        const data = {
          ...row.value,
          updatedAt: row.updated_at,
          migratedFromPg: true
        };
        const docRef = collection.doc(row.key);
        batch.set(docRef, data, { merge: true });
      }
      await batch.commit();
      results.world_state = pgWorld.rows.length;
    }

    console.log('Migration completed successfully:', results);
    res.json({ 
      success: true, 
      message: 'Migration from PostgreSQL to Firestore completed successfully.',
      results
    });

  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
