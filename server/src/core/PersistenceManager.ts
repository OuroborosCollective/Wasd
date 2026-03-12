import { db } from './Database.js';

export class PersistenceManager {
  async save(data: any) {
    try {
      for (const id in data) {
        const player = data[id];
        await db.query(
          `INSERT INTO players (username, email, level, experience, matrix_energy, position_x, position_y, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (username) DO UPDATE SET
           level = EXCLUDED.level,
           experience = EXCLUDED.experience,
           matrix_energy = EXCLUDED.matrix_energy,
           position_x = EXCLUDED.position_x,
           position_y = EXCLUDED.position_y,
           data = EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
          [
            player.name,
            player.email || `${player.name.toLowerCase()}@areloria.world`,
            player.level || 1,
            player.xp || 0,
            player.matrixEnergy || 0,
            player.position.x,
            player.position.y,
            JSON.stringify(player)
          ]
        );
      }
    } catch (err) {
      console.error('Failed to save player persistence data to Postgres:', err);
    }
  }

  async saveChunks(chunks: any[]) {
    try {
      for (const chunk of chunks) {
        await db.query(
          `INSERT INTO world_chunks (id, x, y, data, last_active)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
           data = EXCLUDED.data,
           last_active = CURRENT_TIMESTAMP`,
          [chunk.id, chunk.x, chunk.y, JSON.stringify(chunk.data)]
        );
      }
    } catch (err) {
      console.error('Failed to save chunk persistence data to Postgres:', err);
    }
  }

  async saveNPCs(npcs: any[]) {
    try {
      for (const npc of npcs) {
        await db.query(
          `INSERT INTO npc_entities (name, archetype, position_x, position_y, memory_data)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [npc.name, npc.role, npc.position.x, npc.position.y, JSON.stringify(npc.memory || [])]
        );
      }
    } catch (err) {
      console.error('Failed to save NPC persistence data to Postgres:', err);
    }
  }

  async load(): Promise<any> {
    try {
      const res = await db.query('SELECT * FROM players');
      const data: any = {};
      res.rows.forEach(row => {
        data[row.username] = {
          ...row.data,
          id: row.id,
          name: row.username,
          level: row.level,
          xp: row.experience,
          matrixEnergy: row.matrix_energy,
          position: { x: row.position_x, y: row.position_y, z: 0 }
        };
      });
      return data;
    } catch (err) {
      console.error('Failed to load persistence data from Postgres:', err);
      return {};
    }
  }
}
