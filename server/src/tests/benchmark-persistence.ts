import { PersistenceManager } from "../core/PersistenceManager.js";
import { db, testConnection } from "../core/Database.js";

async function run() {
  const connected = await testConnection();
  if (!connected) {
    console.log("No DB connection");
    return;
  }
  const pm = new PersistenceManager();
  await pm.init();

  const numPlayers = 500;
  const data: any = {};
  for (let i = 0; i < numPlayers; i++) {
    data[`player_${i}`] = {
      id: `player_${i}`,
      name: `Player ${i}`,
      role: "player",
      level: 1,
      xp: 0,
      gold: 100,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      mana: 50,
      maxMana: 50,
      position: { x: i, y: 0, z: i },
      skills: {},
      inventory: [],
      equipment: {},
      quests: [],
      flags: {},
      reputation: {}
    };
  }

  const start = Date.now();
  await pm.save(data);
  const end = Date.now();
  console.log(`Saved ${numPlayers} players in ${end - start}ms`);

  // clean up
  await db.query("DELETE FROM players WHERE id LIKE 'player_%'");
  process.exit(0);
}

run().catch(console.error);
