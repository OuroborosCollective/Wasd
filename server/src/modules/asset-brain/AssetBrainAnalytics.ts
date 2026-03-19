/**
 * Asset Brain Analytics & Monitoring
 * Tracks asset generation metrics, performance, and user behavior
 */

import { Database } from '../../core/Database.js';

export interface AssetMetrics {
  totalAssetsGenerated: number;
  totalVariantsGenerated: number;
  averageGenerationTime: number; // ms
  averageModelSize: number; // bytes
  platformDistribution: Record<string, number>;
  assetClassDistribution: Record<string, number>;
  topUsers: Array<{ userId: string; assetsGenerated: number }>;
  topAssets: Array<{ assetId: string; downloads: number }>;
  errorRate: number; // percentage
}

export class AssetBrainAnalytics {
  private metricsBuffer: Map<string, any> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private db: Database) {
    this.startFlushTimer();
  }

  /**
   * Record asset generation event
   */
  async recordAssetGeneration(
    userId: string,
    assetId: string,
    assetClass: string,
    generationTime: number,
    modelSize: number,
    success: boolean
  ): Promise<void> {
    const event = {
      userId,
      assetId,
      assetClass,
      generationTime,
      modelSize,
      success,
      timestamp: new Date(),
    };

    // Buffer event for batch insert
    const key = `asset_gen_${Date.now()}`;
    this.metricsBuffer.set(key, event);
  }

  /**
   * Record variant generation
   */
  async recordVariantGeneration(
    assetId: string,
    variantType: string,
    platform: string,
    triangleCount: number,
    generationTime: number
  ): Promise<void> {
    const event = {
      assetId,
      variantType,
      platform,
      triangleCount,
      generationTime,
      timestamp: new Date(),
    };

    const key = `variant_gen_${Date.now()}`;
    this.metricsBuffer.set(key, event);
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AssetMetrics> {
    const hoursBack = {
      hour: 1,
      day: 24,
      week: 168,
      month: 720,
    }[timeRange];

    const since = new Date(Date.now() - hoursBack * 3600 * 1000);

    // Get asset generation stats
    const assetStats = await this.db.query(
      `SELECT 
        COUNT(*) as total,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_time,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::float / COUNT(*) * 100 as error_rate
      FROM asset_specifications 
      WHERE created_at > $1`,
      [since]
    );

    const stats = assetStats.rows[0] || {};

    // Get platform distribution
    const platformDist = await this.db.query(
      `SELECT 
        specification->>'platformProfiles' as platform,
        COUNT(*) as count
      FROM asset_specifications
      WHERE created_at > $1
      GROUP BY specification->>'platformProfiles'`,
      [since]
    );

    // Get asset class distribution
    const classDist = await this.db.query(
      `SELECT asset_class, COUNT(*) as count
      FROM asset_specifications
      WHERE created_at > $1
      GROUP BY asset_class`,
      [since]
    );

    // Get top users
    const topUsers = await this.db.query(
      `SELECT user_id, COUNT(*) as assets_generated
      FROM asset_specifications
      WHERE created_at > $1
      GROUP BY user_id
      ORDER BY assets_generated DESC
      LIMIT 10`,
      [since]
    );

    return {
      totalAssetsGenerated: parseInt(stats.total || '0'),
      totalVariantsGenerated: 0, // Would query from asset_variants
      averageGenerationTime: parseFloat(stats.avg_time || '0'),
      averageModelSize: 0, // Would calculate from actual files
      platformDistribution: Object.fromEntries(
        platformDist.rows.map((r: any) => [r.platform, r.count])
      ),
      assetClassDistribution: Object.fromEntries(
        classDist.rows.map((r: any) => [r.asset_class, r.count])
      ),
      topUsers: topUsers.rows.map((r: any) => ({
        userId: r.user_id,
        assetsGenerated: r.assets_generated,
      })),
      topAssets: [], // Would query from download tracking
      errorRate: parseFloat(stats.error_rate || '0'),
    };
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights(): Promise<{
    slowestAssets: Array<{ assetId: string; avgTime: number }>;
    largestAssets: Array<{ assetId: string; size: number }>;
    mostFailedAssets: Array<{ assetId: string; failureRate: number }>;
  }> {
    // Slowest assets
    const slowest = await this.db.query(
      `SELECT 
        id,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_time
      FROM asset_specifications
      GROUP BY id
      ORDER BY avg_time DESC
      LIMIT 10`
    );

    // Largest assets (would need file size tracking)
    const largest = await this.db.query(
      `SELECT id, asset_name
      FROM asset_specifications
      ORDER BY created_at DESC
      LIMIT 10`
    );

    // Most failed
    const mostFailed = await this.db.query(
      `SELECT 
        id,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::float / COUNT(*) * 100 as failure_rate
      FROM asset_specifications
      GROUP BY id
      HAVING COUNT(*) > 5
      ORDER BY failure_rate DESC
      LIMIT 10`
    );

    return {
      slowestAssets: slowest.rows.map((r: any) => ({
        assetId: r.id,
        avgTime: parseFloat(r.avg_time || '0'),
      })),
      largestAssets: largest.rows.map((r: any) => ({
        assetId: r.id,
        size: 0, // Would get from file system
      })),
      mostFailedAssets: mostFailed.rows.map((r: any) => ({
        assetId: r.id,
        failureRate: parseFloat(r.failure_rate || '0'),
      })),
    };
  }

  /**
   * Flush buffered metrics to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.size === 0) return;

    try {
      // Batch insert metrics
      const events = Array.from(this.metricsBuffer.values());
      
      // Insert into analytics table (would need to create this table)
      for (const event of events) {
        await this.db.query(
          `INSERT INTO asset_generation_events (user_id, asset_id, asset_class, generation_time, model_size, success, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            event.userId,
            event.assetId,
            event.assetClass,
            event.generationTime,
            event.modelSize,
            event.success,
            event.timestamp,
          ]
        ).catch(() => {
          // Table might not exist yet
        });
      }

      this.metricsBuffer.clear();
    } catch (error) {
      console.error('[AssetBrainAnalytics] Flush error:', error);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics().catch(console.error);
    }, 60000); // Flush every minute
  }

  /**
   * Stop analytics
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics().catch(console.error);
  }
}
