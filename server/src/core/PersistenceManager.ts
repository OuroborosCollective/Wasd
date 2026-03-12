import { db } from './Database.js';

export class PersistenceManager {
  async save(data: any) {
    try {
      for (const id in data) {
        const player = data[id];
        // Use username as the unique key for now as id in memory might be different from UUID in DB
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
      console.error('Failed to save persistence data to Postgres:', err);
    }
  }

  async load(): Promise<any> {
    try {
      const res = await db.query('SELECT * FROM players');
      const data: any = {};
      res.rows.forEach(row => {
        // Merge DB columns with the JSON data
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
