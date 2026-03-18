/**
 * Asset Brain Architect - Database Operations
 * Handles all CRUD operations for asset specifications and variants
 */
import { Database } from '../../core/Database.js';
import type { AssetSpecification } from './assetBrainEngine.js';

// ── Local DB record types (not the engine types) ─────────────────────────────

export interface AssetRecord {
  id: string;
  userId: string;
  assetName: string;
  assetClass: string;
  style: string;
  usage: string;
  description?: string;
  tags?: string[];
  specification: string; // JSON-serialized AssetSpecification
  isPublic: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetVariantRecord {
  id: string;
  specificationId: string;
  variantType: 'hero' | 'gameplay' | 'mobileweb';
  triangleCount: number;
  boneCount?: number;
  textureResolution: string;
  description: string;
  createdAt: Date;
}

export interface BatchJobRecord {
  id: string;
  userId: string;
  jobType: 'csv-import' | 'json-import' | 'batch-generate';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputFile: string;
  outputFile?: string;
  assetsGenerated: number;
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}

export class AssetBrainDatabase {
  constructor(private db: Database) {}

  /**
   * Initialize database tables for Asset Brain
   */
  async initializeTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS asset_specifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        asset_name VARCHAR(255) NOT NULL,
        asset_class VARCHAR(50) NOT NULL,
        style VARCHAR(100),
        usage TEXT,
        description TEXT,
        tags TEXT,
        specification TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_asset_spec_user ON asset_specifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_asset_spec_class ON asset_specifications(asset_class)`,
      `CREATE TABLE IF NOT EXISTS asset_variants (
        id VARCHAR(36) PRIMARY KEY,
        specification_id VARCHAR(36) NOT NULL,
        variant_type VARCHAR(50) NOT NULL,
        triangle_count INTEGER,
        bone_count INTEGER,
        texture_resolution VARCHAR(50),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_variant_spec ON asset_variants(specification_id)`,
      `CREATE TABLE IF NOT EXISTS asset_batch_jobs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        input_file TEXT,
        output_file TEXT,
        assets_generated INTEGER DEFAULT 0,
        errors TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )`,
    ];

    for (const query of queries) {
      try {
        await this.db.query(query);
      } catch (error) {
        // Tables may already exist — ignore
        console.warn('[AssetBrain] Table init warning:', (error as Error).message);
      }
    }
  }

  /**
   * Create a new asset specification
   */
  async createSpecification(
    spec: Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<AssetRecord> {
    const id = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const query = `
      INSERT INTO asset_specifications (
        id, user_id, asset_name, asset_class, style, usage, description, tags,
        specification, version, is_public, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `;
    const result = await this.db.query(query, [
      id,
      spec.userId,
      spec.assetName,
      spec.assetClass,
      spec.style,
      spec.usage,
      spec.description ?? null,
      JSON.stringify(spec.tags ?? []),
      spec.specification,
      1,
      spec.isPublic ?? false,
      now,
      now,
    ]);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get specification by ID
   */
  async getSpecification(id: string): Promise<AssetRecord | null> {
    const result = await this.db.query(
      `SELECT * FROM asset_specifications WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get all specifications for a user
   */
  async getUserSpecifications(userId: string): Promise<AssetRecord[]> {
    const result = await this.db.query(
      `SELECT * FROM asset_specifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map((r: any) => this.mapRow(r));
  }

  /**
   * Search public specifications by class and style
   */
  async searchSpecifications(assetClass?: string, style?: string): Promise<AssetRecord[]> {
    const conditions: string[] = ['is_public = true'];
    const params: unknown[] = [];
    if (assetClass) { params.push(assetClass); conditions.push(`asset_class = $${params.length}`); }
    if (style)      { params.push(`%${style}%`); conditions.push(`style ILIKE $${params.length}`); }
    const result = await this.db.query(
      `SELECT * FROM asset_specifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50`,
      params
    );
    return result.rows.map((r: any) => this.mapRow(r));
  }

  /**
   * Search asset library
   */
  async searchLibrary(assetClass?: string, style?: string): Promise<AssetRecord[]> {
    return this.searchSpecifications(assetClass, style);
  }

  /**
   * Create a variant record
   */
  async createVariant(
    variant: Omit<AssetVariantRecord, 'id' | 'createdAt'>
  ): Promise<AssetVariantRecord> {
    const id = `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO asset_variants (id, specification_id, variant_type, triangle_count, bone_count, texture_resolution, description, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, variant.specificationId, variant.variantType, variant.triangleCount, variant.boneCount ?? null, variant.textureResolution, variant.description, now]
    );
    return this.mapVariantRow(result.rows[0]);
  }

  /**
   * Get variants for a specification
   */
  async getVariants(specificationId: string): Promise<AssetVariantRecord[]> {
    const result = await this.db.query(
      `SELECT * FROM asset_variants WHERE specification_id = $1 ORDER BY created_at ASC`,
      [specificationId]
    );
    return result.rows.map((r: any) => this.mapVariantRow(r));
  }

  /**
   * Create a batch job
   */
  async createBatchJob(
    job: Omit<BatchJobRecord, 'id' | 'createdAt'>
  ): Promise<BatchJobRecord> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO asset_batch_jobs (id, user_id, job_type, status, input_file, assets_generated, errors, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, job.userId, job.jobType, job.status, job.inputFile, job.assetsGenerated, JSON.stringify(job.errors), now]
    );
    return this.mapJobRow(result.rows[0]);
  }

  // ── Row mappers ─────────────────────────────────────────────────────────────

  private mapRow(row: any): AssetRecord {
    return {
      id: row.id,
      userId: row.user_id,
      assetName: row.asset_name,
      assetClass: row.asset_class,
      style: row.style,
      usage: row.usage,
      description: row.description ?? undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      specification: row.specification,
      isPublic: row.is_public,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapVariantRow(row: any): AssetVariantRecord {
    return {
      id: row.id,
      specificationId: row.specification_id,
      variantType: row.variant_type,
      triangleCount: row.triangle_count,
      boneCount: row.bone_count ?? undefined,
      textureResolution: row.texture_resolution,
      description: row.description,
      createdAt: row.created_at,
    };
  }

  private mapJobRow(row: any): BatchJobRecord {
    return {
      id: row.id,
      userId: row.user_id,
      jobType: row.job_type,
      status: row.status,
      inputFile: row.input_file,
      outputFile: row.output_file ?? undefined,
      assetsGenerated: row.assets_generated,
      errors: row.errors ? JSON.parse(row.errors) : [],
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
    };
  }
}
