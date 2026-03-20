/**
 * LandSystem – Player Land Ownership for Areloria MMORPG
 * Players can claim land, build on it, and place GLB models.
 * Land is defined by a center position and a radius.
 */

import { DatabaseService } from "../../core/Database.js";
type Database = DatabaseService;
import { v4 as uuidv4 } from "uuid";

export interface Land {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  claimedAt: Date;
  structures: LandStructure[];
}

export interface LandStructure {
  id: string;
  landId: string;
  type: string; // "house", "wall", "tower", "glb_model"
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  glbPath?: string;
  name?: string;
  placedAt: Date;
}

const LAND_RADIUS = 100; // Default land radius in world units
const MIN_LAND_DISTANCE = 250; // Minimum distance between land plots
const LAND_CLAIM_COST = 500; // Matrix Energy cost to claim land

export class LandSystem {
  private lands: Map<string, Land> = new Map();
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async init() {
    await this.db.query(`
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
    `).catch(() => {});

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS paypal_orders (
        order_id VARCHAR(64) PRIMARY KEY,
        player_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(128) NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `).catch(() => {});

    // Add missing columns to players table
    await this.db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS matrix_energy INTEGER DEFAULT 0`).catch(() => {});
    await this.db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_enabled BOOLEAN DEFAULT false`).catch(() => {});
    await this.db.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS glb_subscription_expires TIMESTAMPTZ`).catch(() => {});

    // Load all lands and their structures from DB efficiently
    const [landsResult, structsResult] = await Promise.all([
      this.db.query(`SELECT * FROM player_lands`).catch(() => ({ rows: [] })),
      this.db.query(`SELECT * FROM land_structures`).catch(() => ({ rows: [] }))
    ]);

    // Group structures by landId for fast lookup
    const structuresByLand = new Map<string, any[]>();
    for (const s of structsResult.rows) {
      if (!structuresByLand.has(s.land_id)) {
        structuresByLand.set(s.land_id, []);
      }
      structuresByLand.get(s.land_id)?.push({
        id: s.id,
        landId: s.land_id,
        type: s.type,
        x: s.x, y: s.y, z: s.z,
        rotY: s.rot_y,
        scale: s.scale,
        glbPath: s.glb_path,
        name: s.name,
        placedAt: s.placed_at,
      });
    }

    // Populate the lands map
    for (const row of landsResult.rows) {
      this.lands.set(row.id, {
        id: row.id,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        name: row.name,
        x: row.x,
        y: row.y,
        radius: row.radius,
        claimedAt: row.claimed_at,
        structures: structuresByLand.get(row.id) || [],
      });
    }
    console.log(`LandSystem: Loaded ${this.lands.size} land plots.`);
  }

  getLandByOwner(ownerId: string): Land | null {
    for (const land of this.lands.values()) {
      if (land.ownerId === ownerId) return land;
    }
    return null;
  }

  getLandById(landId: string): Land | null {
    return this.lands.get(landId) || null;
  }

  getLandAtPosition(x: number, y: number): Land | null {
    for (const land of this.lands.values()) {
      const dist = Math.hypot(x - land.x, y - land.y);
      if (dist <= land.radius) return land;
    }
    return null;
  }

  getAllLands(): Land[] {
    return Array.from(this.lands.values());
  }

  async claimLand(
    ownerId: string,
    ownerName: string,
    x: number,
    y: number,
    name: string,
    dbClient?: any
  ): Promise<{ success: boolean; reason?: string; land?: Land }> {
    if (this.getLandByOwner(ownerId)) {
      return { success: false, reason: "You already own land. Sell or abandon it first." };
    }

    // Check for overlap with other lands (considering radii)
    for (const land of this.lands.values()) {
      const dist = Math.hypot(x - land.x, y - land.y);
      const minSafeDistance = land.radius + LAND_RADIUS;
      if (dist < minSafeDistance) {
        return { success: false, reason: `Overlaps with ${land.ownerName}'s land. Required separation: ${minSafeDistance}m` };
      }

      // Also respect the global minimum distance if it's larger than the radius-based overlap
      if (dist < MIN_LAND_DISTANCE) {
        return { success: false, reason: `Too close to ${land.ownerName}'s land. Minimum distance: ${MIN_LAND_DISTANCE}m` };
      }
    }

    const landId = uuidv4();
    const newLand: Land = {
      id: landId,
      ownerId,
      ownerName,
      name: name || `${ownerName}'s Land`,
      x, y,
      radius: LAND_RADIUS,
      claimedAt: new Date(),
      structures: [],
    };

    const query = dbClient ? dbClient.query.bind(dbClient) : this.db.query.bind(this.db);
    await query(
      `INSERT INTO player_lands (id, owner_id, owner_name, name, x, y, radius)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [landId, ownerId, ownerName, newLand.name, x, y, LAND_RADIUS]
    );

    this.lands.set(landId, newLand);
    return { success: true, land: newLand };
  }

  async addStructure(
    landId: string,
    ownerId: string,
    type: string,
    x: number, y: number, z: number,
    rotY: number, scale: number,
    glbPath?: string,
    name?: string
  ): Promise<{ success: boolean; structure?: LandStructure; reason?: string }> {
    const land = this.lands.get(landId);
    if (!land) return { success: false, reason: "Land not found" };
    if (land.ownerId !== ownerId) return { success: false, reason: "Not your land" };

    // Validate placement within radius (x and z are world coordinates, land x and y are world x and z)
    const dist = Math.hypot(x - land.x, z - land.y);
    if (dist > land.radius) {
      return { success: false, reason: `Structure is too far from land center. Max radius: ${land.radius}m` };
    }

    const structId = uuidv4();
    const structure: LandStructure = {
      id: structId,
      landId,
      type,
      x, y, z, rotY, scale,
      glbPath,
      name,
      placedAt: new Date(),
    };

    await this.db.query(
      `INSERT INTO land_structures (id, land_id, type, x, y, z, rot_y, scale, glb_path, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [structId, landId, type, x, y, z, rotY, scale, glbPath || null, name || null]
    );

    land.structures.push(structure);
    return { success: true, structure };
  }

  async removeStructure(landId: string, ownerId: string, structId: string, dbClient?: any): Promise<boolean> {
    const land = this.lands.get(landId);
    if (!land || land.ownerId !== ownerId) return false;

    // Verify structure exists in land
    if (!land.structures.some(s => s.id === structId)) return false;

    const query = dbClient ? dbClient.query.bind(dbClient) : this.db.query.bind(this.db);
    await query(
      `DELETE FROM land_structures WHERE id=$1 AND land_id=$2`,
      [structId, landId]
    );
    land.structures = land.structures.filter(s => s.id !== structId);
    return true;
  }

  async abandonLand(ownerId: string): Promise<boolean> {
    const land = this.getLandByOwner(ownerId);
    if (!land) return false;

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM land_structures WHERE land_id=$1`, [land.id]);
      await client.query(`DELETE FROM player_lands WHERE id=$1`, [land.id]);
      await client.query('COMMIT');

      this.lands.delete(land.id);
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`LandSystem: Failed to abandon land for ${ownerId}:`, e);
      return false;
    } finally {
      client.release();
    }
  }

  getLandClaimCost(): number {
    return LAND_CLAIM_COST;
  }
}
