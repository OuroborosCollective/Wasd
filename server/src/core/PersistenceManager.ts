import { db, testConnection } from "./Database.js";

export class PersistenceManager {
  private connected = false;

  constructor() {}

  async init(): Promise<void> {
    this.connected = await testConnection();
    if (!this.connected) {
      console.warn("PersistenceManager: Running in offline mode (no DB). Data will not persist.");
    }
  }

  async savePlayer(player: any): Promise<void> {
    if (!this.connected) return;
    try {
      await db.query(
        `INSERT INTO players (id, name, role, level, xp, gold, health, max_health, stamina, max_stamina, mana, max_mana, pos_x, pos_y, pos_z, skills, inventory, equipment, quests, flags, reputation, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
         ON CONFLICT (id) DO UPDATE SET
           name=$2, role=$3, level=$4, xp=$5, gold=$6, health=$7, max_health=$8,
           stamina=$9, max_stamina=$10, mana=$11, max_mana=$12,
           pos_x=$13, pos_y=$14, pos_z=$15,
           skills=$16, inventory=$17, equipment=$18, quests=$19, flags=$20, reputation=$21,
           updated_at=NOW()`,
        [
          player.id,
          player.name || player.id,
          player.role || "player",
          player.level ?? 1,
          player.xp ?? 0,
          player.gold ?? 0,
          player.health ?? 100,
          player.maxHealth ?? 100,
          player.stamina ?? 100,
          player.maxStamina ?? 100,
          player.mana ?? 25,
          player.maxMana ?? 25,
          player.position?.x ?? 0,
          player.position?.y ?? 0,
          player.position?.z ?? 0,
          JSON.stringify(player.skills || {}),
          JSON.stringify(this.stripInventory(player.inventory || [])),
          JSON.stringify(this.stripEquipment(player.equipment || {})),
          JSON.stringify(player.quests || []),
          JSON.stringify(player.flags || {}),
          JSON.stringify(player.reputation || {}),
        ]
      );
    } catch (err) {
      console.error("Failed to save player:", player.id, err);
    }
  }

  async loadPlayer(id: string): Promise<any | null> {
    if (!this.connected) return null;
    try {
      const result = await db.query("SELECT * FROM players WHERE id = $1", [id]);
      if (result.rows.length === 0) return null;
      return this.rowToPlayer(result.rows[0]);
    } catch (err) {
      console.error("Failed to load player:", id, err);
      return null;
    }
  }

  async save(data: any): Promise<void> {
    if (!this.connected) return;

    const players = Object.values(data);
    if (players.length === 0) return;

    // Process in chunks of 500 to stay well under PostgreSQL's 65535 parameter limit.
    // Each player requires 21 parameters. 500 * 21 = 10500 parameters.
    const CHUNK_SIZE = 500;

    for (let i = 0; i < players.length; i += CHUNK_SIZE) {
      const chunk = players.slice(i, i + CHUNK_SIZE);
      await this.savePlayerChunk(chunk);
    }
  }

  private async savePlayerChunk(players: any[]): Promise<void> {
    if (players.length === 0) return;

    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const player of players) {
      const chunkParams = [
        player.id,
        player.name || player.id,
        player.role || "player",
        player.level ?? 1,
        player.xp ?? 0,
        player.gold ?? 0,
        player.health ?? 100,
        player.maxHealth ?? 100,
        player.stamina ?? 100,
        player.maxStamina ?? 100,
        player.mana ?? 25,
        player.maxMana ?? 25,
        player.position?.x ?? 0,
        player.position?.y ?? 0,
        player.position?.z ?? 0,
        JSON.stringify(player.skills || {}),
        JSON.stringify(this.stripInventory(player.inventory || [])),
        JSON.stringify(this.stripEquipment(player.equipment || {})),
        JSON.stringify(player.quests || []),
        JSON.stringify(player.flags || {}),
        JSON.stringify(player.reputation || {}),
      ];

      const valuePlaceholders = [];
      for (const param of chunkParams) {
        params.push(param);
        valuePlaceholders.push("$" + paramIndex++);
      }
      values.push(`(${valuePlaceholders.join(",")}, NOW())`);
    }

    try {
      await db.query(
        `INSERT INTO players (id, name, role, level, xp, gold, health, max_health, stamina, max_stamina, mana, max_mana, pos_x, pos_y, pos_z, skills, inventory, equipment, quests, flags, reputation, updated_at)
         VALUES ${values.join(",\n         ")}
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, role=EXCLUDED.role, level=EXCLUDED.level, xp=EXCLUDED.xp, gold=EXCLUDED.gold,
           health=EXCLUDED.health, max_health=EXCLUDED.max_health, stamina=EXCLUDED.stamina, max_stamina=EXCLUDED.max_stamina,
           mana=EXCLUDED.mana, max_mana=EXCLUDED.max_mana, pos_x=EXCLUDED.pos_x, pos_y=EXCLUDED.pos_y, pos_z=EXCLUDED.pos_z,
           skills=EXCLUDED.skills, inventory=EXCLUDED.inventory, equipment=EXCLUDED.equipment, quests=EXCLUDED.quests,
           flags=EXCLUDED.flags, reputation=EXCLUDED.reputation, updated_at=NOW()`,
        params
      );
    } catch (err) {
      console.error("Failed to batch save players chunk:", err);
      throw err;
    }
  }

  async load(): Promise<any> {
    if (!this.connected) return {};
    try {
      const result = await db.query("SELECT * FROM players");
      const data: any = {};
      for (const row of result.rows) {
        const player = this.rowToPlayer(row);
        data[player.id] = player;
      }
      return data;
    } catch (err) {
      console.error("Failed to load all players:", err);
      return {};
    }
  }

  async saveChatMessage(sender: string, channel: string, text: string): Promise<void> {
    if (!this.connected) return;
    try {
      await db.query(
        "INSERT INTO chat_messages (sender, channel, text) VALUES ($1, $2, $3)",
        [sender, channel, text]
      );
    } catch (err) {
      console.error("Failed to save chat message:", err);
    }
  }

  async getRecentChat(limit: number = 50): Promise<any[]> {
    if (!this.connected) return [];
    try {
      const result = await db.query(
        "SELECT sender, channel, text, created_at FROM chat_messages ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return result.rows.reverse().map((r: any) => ({
        sender: r.sender,
        channel: r.channel,
        text: r.text,
        timestamp: new Date(r.created_at).getTime(),
      }));
    } catch (err) {
      console.error("Failed to load chat:", err);
      return [];
    }
  }

  async saveWorldState(key: string, value: any): Promise<void> {
    if (!this.connected) return;
    try {
      await db.query(
        `INSERT INTO world_state (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, JSON.stringify(value)]
      );
    } catch (err) {
      console.error("Failed to save world state:", key, err);
    }
  }

  async loadWorldState(key: string): Promise<any | null> {
    if (!this.connected) return null;
    try {
      const result = await db.query("SELECT value FROM world_state WHERE key = $1", [key]);
      if (result.rows.length === 0) return null;
      return result.rows[0].value;
    } catch (err) {
      console.error("Failed to load world state:", key, err);
      return null;
    }
  }

  private rowToPlayer(row: any): any {
    return {
      id: row.id,
      name: row.name,
      role: row.role || "player",
      level: row.level || 1,
      xp: row.xp || 0,
      gold: row.gold || 0,
      health: row.health || 100,
      maxHealth: row.max_health || 100,
      stamina: row.stamina || 100,
      maxStamina: row.max_stamina || 100,
      mana: row.mana || 25,
      maxMana: row.max_mana || 25,
      position: { x: row.pos_x || 0, y: row.pos_y || 0, z: row.pos_z || 0 },
      skills: row.skills || {},
      inventory: row.inventory || [],
      equipment: row.equipment || { weapon: null, armor: null },
      quests: row.quests || [],
      flags: row.flags || {},
      reputation: row.reputation || {},
    };
  }

  private stripInventory(inventory: any[]): any[] {
    return inventory.map((item: any) => {
      if (!item || !item.id) return item;
      return { id: item.id };
    });
  }

  private stripEquipment(equipment: any): any {
    const result: any = {};
    for (const slot in equipment) {
      if (equipment[slot] && equipment[slot].id) {
        result[slot] = { id: equipment[slot].id };
      } else {
        result[slot] = null;
      }
    }
    return result;
  }
}
