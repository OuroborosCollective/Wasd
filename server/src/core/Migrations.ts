/**
 * Database Migrations - Creates all required tables on server startup
 */
import { db } from "./Database.js";

export async function runMigrations(): Promise<void> {
  console.log("Running database migrations...");

  try {
    // Players table
    await db.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        x FLOAT DEFAULT 0,
        y FLOAT DEFAULT 0,
        z FLOAT DEFAULT 0,
        hp INTEGER DEFAULT 100,
        max_hp INTEGER DEFAULT 100,
        mp INTEGER DEFAULT 100,
        max_mp INTEGER DEFAULT 100,
        sp INTEGER DEFAULT 100,
        max_sp INTEGER DEFAULT 100,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        gold INTEGER DEFAULT 0,
        matrix_energy INTEGER DEFAULT 0,
        glb_enabled BOOLEAN DEFAULT FALSE,
        glb_subscription_expires TIMESTAMP,
        inventory JSONB DEFAULT '[]',
        skills JSONB DEFAULT '{}',
        quests JSONB DEFAULT '[]',
        equipment JSONB DEFAULT '{}',
        guild_id VARCHAR(64),
        nation_id VARCHAR(64),
        is_banned BOOLEAN DEFAULT FALSE,
        is_muted BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Extend players table with new columns if they don't exist
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS matrix_energy INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_enabled BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_subscription_expires TIMESTAMP`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS nation_id VARCHAR(64)`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS appearance JSONB DEFAULT NULL`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name VARCHAR(128)`);
    await db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

    // PayPal orders
    await db.query(`
      CREATE TABLE IF NOT EXISTS paypal_orders (
        id VARCHAR(64) PRIMARY KEY,
        player_id VARCHAR(128) NOT NULL,
        player_name VARCHAR(128),
        product_id VARCHAR(64) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(8) DEFAULT 'EUR',
        status VARCHAR(32) DEFAULT 'pending',
        paypal_order_id VARCHAR(128),
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Player GLB models
    await db.query(`
      CREATE TABLE IF NOT EXISTS player_glb_models (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(128) NOT NULL,
        owner_name VARCHAR(128),
        name VARCHAR(256) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_size INTEGER DEFAULT 0,
        marketplace_listed BOOLEAN DEFAULT FALSE,
        marketplace_price INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);


    // Player lands
    await db.query(`
      CREATE TABLE IF NOT EXISTS player_lands (
        id VARCHAR(36) PRIMARY KEY,
        owner_id VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255),
        name VARCHAR(255) DEFAULT 'My Land',
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        radius FLOAT DEFAULT 100,
        claimed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Land structures
    await db.query(`
      CREATE TABLE IF NOT EXISTS land_structures (
        id VARCHAR(36) PRIMARY KEY,
        land_id VARCHAR(36) NOT NULL,
        type VARCHAR(64) NOT NULL,
        x FLOAT DEFAULT 0,
        y FLOAT DEFAULT 0,
        z FLOAT DEFAULT 0,
        rot_y FLOAT DEFAULT 0,
        scale FLOAT DEFAULT 1.0,
        glb_path TEXT,
        name VARCHAR(255),
        placed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Land plots
    await db.query(`
      CREATE TABLE IF NOT EXISTS land_plots (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(128) NOT NULL,
        owner_name VARCHAR(128),
        name VARCHAR(256),
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        radius FLOAT DEFAULT 50,
        structures JSONB DEFAULT '[]',
        claimed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Marketplace transactions
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketplace_transactions (
        id SERIAL PRIMARY KEY,
        model_id VARCHAR(64) NOT NULL,
        seller_id VARCHAR(128) NOT NULL,
        buyer_id VARCHAR(128) NOT NULL,
        price INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Nations/Guilds
    await db.query(`
      CREATE TABLE IF NOT EXISTS nations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        leader_id VARCHAR(128) NOT NULL,
        members JSONB DEFAULT '[]',
        territory JSONB DEFAULT '[]',
        diplomacy JSONB DEFAULT '{}',
        treasury INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Chat history
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        player_id VARCHAR(128),
        player_name VARCHAR(128),
        channel VARCHAR(32) DEFAULT 'global',
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // World state
    await db.query(`
      CREATE TABLE IF NOT EXISTS world_state (
        key VARCHAR(128) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Asset Brain - Generated Assets (Tripo3D pipeline output)
    await db.query(`
      CREATE TABLE IF NOT EXISTS generated_assets (
        id VARCHAR(64) PRIMARY KEY,
        asset_name VARCHAR(256) NOT NULL,
        asset_class VARCHAR(64) NOT NULL,
        style VARCHAR(64) NOT NULL,
        glb_path VARCHAR(512),
        glb_remote_url TEXT,
        thumbnail_url TEXT,
        spec_json JSONB,
        tripo_task_id VARCHAR(128),
        created_by VARCHAR(128),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Asset Brain - Spec records
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_brain_specs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        asset_name VARCHAR(256) NOT NULL,
        asset_class VARCHAR(64) NOT NULL,
        style VARCHAR(64) NOT NULL,
        platform_targets JSONB DEFAULT '[]',
        spec_json JSONB NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Database migrations completed successfully.");
  } catch (err) {
    console.error("Migration error (non-fatal):", err);
  }
}
