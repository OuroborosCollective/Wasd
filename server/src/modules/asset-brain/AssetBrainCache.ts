/**
 * Asset Brain Cache Manager
 * Implements multi-level caching for asset specifications and generated models
 * - L1: In-memory cache (hot assets)
 * - L2: Redis cache (shared across instances)
 * - L3: Database (persistent storage)
 */

import { Database } from '../../core/Database.js';
import type { AssetRecord, AssetVariantRecord } from './AssetBrainDatabase.js';

export interface CacheConfig {
  l1MaxSize: number; // In-memory cache size (items)
  l1TTL: number; // TTL in seconds
  l2Enabled: boolean; // Use Redis
  l2TTL: number; // Redis TTL in seconds
  compressionEnabled: boolean;
}

export class AssetBrainCache {
  private l1Cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private l1Config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(private db: Database, config?: Partial<CacheConfig>) {
    this.l1Config = {
      l1MaxSize: config?.l1MaxSize ?? 1000,
      l1TTL: config?.l1TTL ?? 3600, // 1 hour
      l2Enabled: config?.l2Enabled ?? false,
      l2TTL: config?.l2TTL ?? 86400, // 24 hours
      compressionEnabled: config?.compressionEnabled ?? true,
    };
  }

  /**
   * Get cached asset specification
   */
  async getSpecification(specId: string): Promise<AssetRecord | null> {
    // L1: Check in-memory cache
    const cached = this.getFromL1(specId);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    // L2: Check Redis (if enabled)
    if (this.l1Config.l2Enabled) {
      const redisData = await this.getFromL2(specId);
      if (redisData) {
        this.setL1(specId, redisData);
        this.stats.hits++;
        return redisData;
      }
    }

    // L3: Query database
    const result = await this.db.query(
      'SELECT * FROM asset_specifications WHERE id = $1',
      [specId]
    );
    if (result.rows.length > 0) {
      const spec = result.rows[0];
      this.setL1(specId, spec);
      if (this.l1Config.l2Enabled) {
        await this.setL2(specId, spec);
      }
      this.stats.hits++;
      return spec;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Get cached variants for a specification
   */
  async getVariants(specId: string): Promise<AssetVariantRecord[]> {
    const cacheKey = `variants_${specId}`;
    
    // L1: Check in-memory cache
    const cached = this.getFromL1(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    // L2: Check Redis
    if (this.l1Config.l2Enabled) {
      const redisData = await this.getFromL2(cacheKey);
      if (redisData) {
        this.setL1(cacheKey, redisData);
        this.stats.hits++;
        return redisData;
      }
    }

    // L3: Query database
    const result = await this.db.query(
      'SELECT * FROM asset_variants WHERE specification_id = $1 ORDER BY created_at DESC',
      [specId]
    );
    const variants = result.rows;
    this.setL1(cacheKey, variants);
    if (this.l1Config.l2Enabled) {
      await this.setL2(cacheKey, variants);
    }
    this.stats.hits++;
    return variants;
  }

  /**
   * Invalidate cache for a specification
   */
  async invalidateSpecification(specId: string): Promise<void> {
    this.l1Cache.delete(specId);
    this.l1Cache.delete(`variants_${specId}`);
    
    if (this.l1Config.l2Enabled) {
      // Would call Redis DELETE here
      // await redis.del(specId, `variants_${specId}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      l1Size: this.l1Cache.size,
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.l1Cache.clear();
    // Would call Redis FLUSHDB here if L2 enabled
  }

  // ── Private Methods ──────────────────────────────────────────────────────────

  private getFromL1(key: string): any | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.l1Cache.delete(key);
      this.stats.evictions++;
      return null;
    }
    
    return entry.data;
  }

  private setL1(key: string, data: any): void {
    // Evict oldest if cache is full
    if (this.l1Cache.size >= this.l1Config.l1MaxSize) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) {
        this.l1Cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    const expiresAt = Date.now() + (this.l1Config.l1TTL * 1000);
    this.l1Cache.set(key, { data, expiresAt });
  }

  private async getFromL2(key: string): Promise<any | null> {
    // Placeholder for Redis implementation
    // const value = await redis.get(key);
    // return value ? JSON.parse(value) : null;
    return null;
  }

  private async setL2(key: string, data: any): Promise<void> {
    // Placeholder for Redis implementation
    // await redis.setex(key, this.l1Config.l2TTL, JSON.stringify(data));
  }
}
