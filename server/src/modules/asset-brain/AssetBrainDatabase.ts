/**
 * Asset Brain Architect - Database Operations
 * Handles all CRUD operations for asset specifications and variants
 */

import { Database } from '../../core/Database.js';
import type { AssetSpecification, AssetVariant, AssetLibraryEntry, BatchJob } from './AssetBrainSchema.js';

export class AssetBrainDatabase {
  constructor(private db: Database) {}

  /**
   * Initialize database tables for Asset Brain
   */
  async initializeTables(): Promise<void> {
    const queries = [
      // Asset Specifications table
      `CREATE TABLE IF NOT EXISTS asset_specifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        asset_name VARCHAR(255) NOT NULL,
        asset_class VARCHAR(50) NOT NULL,
        style VARCHAR(100),
        usage TEXT,
        description TEXT,
        tags TEXT,
        specification JSONB NOT NULL,
        auto_decisions JSONB,
        version INTEGER DEFAULT 1,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        INDEX idx_user_id (user_id),
        INDEX idx_asset_class (asset_class),
        INDEX idx_style (style)
      )`,

      // Asset Variants table
      `CREATE TABLE IF NOT EXISTS asset_variants (
        id VARCHAR(36) PRIMARY KEY,
        specification_id VARCHAR(36) NOT NULL,
        variant_type VARCHAR(50) NOT NULL,
        triangle_count INTEGER,
        bone_count INTEGER,
        texture_resolution VARCHAR(50),
        description TEXT,
        variant_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (specification_id) REFERENCES asset_specifications(id) ON DELETE CASCADE,
        INDEX idx_spec_id (specification_id)
      )`,

      // Asset Library (public browseable assets)
      `CREATE TABLE IF NOT EXISTS asset_library (
        id VARCHAR(36) PRIMARY KEY,
        specification_id VARCHAR(36) NOT NULL,
        asset_name VARCHAR(255) NOT NULL,
        asset_class VARCHAR(50) NOT NULL,
        style VARCHAR(100),
        tags TEXT,
        thumbnail TEXT,
        is_public BOOLEAN DEFAULT false,
        downloads INTEGER DEFAULT 0,
        rating FLOAT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (specification_id) REFERENCES asset_specifications(id) ON DELETE CASCADE,
        INDEX idx_asset_class (asset_class),
        INDEX idx_style (style),
        INDEX idx_public (is_public)
      )`,

      // Batch Jobs table
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
        completed_at TIMESTAMPTZ,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )`,
    ];

    for (const query of queries) {
      try {
        await this.db.query(query);
      } catch (error) {
        console.error('Error creating table:', error);
      }
    }
  }

  /**
   * Create a new asset specification
   */
  async createSpecification(spec: Omit<AssetSpecification, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<AssetSpecification> {
    const id = `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const query = `
      INSERT INTO asset_specifications (
        id, user_id, asset_name, asset_class, style, usage, description, tags, 
        specification, auto_decisions, version, is_public, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      spec.userId,
      spec.assetName,
      spec.assetClass,
      spec.style,
      spec.usage,
      spec.description || null,
      JSON.stringify(spec.tags || []),
      JSON.stringify(spec),
      JSON.stringify(spec.autoDecisions || []),
      1,
      spec.isPublic || false,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Get specification by ID
   */
  async getSpecification(id: string): Promise<AssetSpecification | null> {
    const query = `SELECT * FROM asset_specifications WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all specifications for a user
   */
  async getUserSpecifications(userId: string): Promise<AssetSpecification[]> {
    const query = `
      SELECT * FROM asset_specifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Search specifications by class and style
   */
  async searchSpecifications(assetClass?: string, style?: string): Promise<AssetSpecification[]> {
    let query = `SELECT * FROM asset_specifications WHERE is_public = true`;
    const params: any[] = [];

    if (assetClass) {
      query += ` AND asset_class = $${params.length + 1}`;
      params.push(assetClass);
    }

    if (style) {
      query += ` AND style = $${params.length + 1}`;
      params.push(style);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Create asset variants
   */
  async createVariant(variant: Omit<AssetVariant, 'id' | 'createdAt'>): Promise<AssetVariant> {
    const id = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO asset_variants (
        id, specification_id, variant_type, triangle_count, bone_count, 
        texture_resolution, description, variant_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      variant.specificationId,
      variant.variantType,
      variant.triangleCount,
      variant.boneCount || null,
      variant.textureResolution,
      variant.description,
      JSON.stringify(variant),
    ]);

    return result.rows[0];
  }

  /**
   * Get variants for a specification
   */
  async getVariants(specificationId: string): Promise<AssetVariant[]> {
    const query = `
      SELECT * FROM asset_variants 
      WHERE specification_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [specificationId]);
    return result.rows;
  }

  /**
   * Create batch job
   */
  async createBatchJob(job: Omit<BatchJob, 'id' | 'createdAt'>): Promise<BatchJob> {
    const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO asset_batch_jobs (
        id, user_id, job_type, status, input_file, assets_generated, errors, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      job.userId,
      job.jobType,
      job.status,
      job.inputFile,
      job.assetsGenerated || 0,
      JSON.stringify(job.errors || []),
    ]);

    return result.rows[0];
  }

  /**
   * Update batch job status
   */
  async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.assetsGenerated !== undefined) {
      fields.push(`assets_generated = $${paramIndex++}`);
      values.push(updates.assetsGenerated);
    }
    if (updates.outputFile) {
      fields.push(`output_file = $${paramIndex++}`);
      values.push(updates.outputFile);
    }
    if (updates.errors) {
      fields.push(`errors = $${paramIndex++}`);
      values.push(JSON.stringify(updates.errors));
    }
    if (updates.completedAt) {
      fields.push(`completed_at = NOW()`);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE asset_batch_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    await this.db.query(query, values);
  }

  /**
   * Add to library
   */
  async addToLibrary(entry: Omit<AssetLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetLibraryEntry> {
    const id = `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const query = `
      INSERT INTO asset_library (
        id, specification_id, asset_name, asset_class, style, tags, 
        thumbnail, is_public, downloads, rating, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      entry.specificationId,
      entry.assetName,
      entry.assetClass,
      entry.style,
      JSON.stringify(entry.tags || []),
      entry.thumbnail || null,
      entry.isPublic,
      entry.downloads || 0,
      entry.rating || 0,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Search library
   */
  async searchLibrary(assetClass?: string, style?: string, tags?: string[]): Promise<AssetLibraryEntry[]> {
    let query = `SELECT * FROM asset_library WHERE is_public = true`;
    const params: any[] = [];

    if (assetClass) {
      query += ` AND asset_class = $${params.length + 1}`;
      params.push(assetClass);
    }

    if (style) {
      query += ` AND style = $${params.length + 1}`;
      params.push(style);
    }

    query += ` ORDER BY downloads DESC, rating DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }
}
