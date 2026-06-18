/**
 * Asset Pipeline API Routes
 * Full End-to-End: Text → Spec → Tripo3D → GLB → Game Registry
 */

import { Router, type Request, type Response } from 'express';
import { getAssetPipeline } from '../modules/asset-brain/AssetPipeline.js';
import { db } from '../core/Database.js';
import { authRequestHandler } from '../middleware/authRequestHandler.js';
import { adminRateLimiter, sensitiveWriteRateLimiter } from '../middleware/rateLimitMiddleware.js';

export function createAssetPipelineRouter(): Router {
  const router = Router();

  router.post('/generate', sensitiveWriteRateLimiter, authRequestHandler, async (req: Request, res: Response): Promise<void> => {
    try {
      const { input, generateModel = true, autoRegister = true } = req.body as {
        input: string;
        generateModel?: boolean;
        autoRegister?: boolean;
      };

      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        res.status(400).json({ error: 'input is required' });
        return;
      }

      const userId = (req as any).userId || (req as any).playerId || 'anonymous';
      const pipeline = getAssetPipeline();
      const jobId = await pipeline.startPipeline(userId, input.trim(), {
        generateModel,
        autoRegister,
      });

      res.json({
        jobId,
        message: 'Pipeline started. Poll /api/pipeline/job/:jobId for status.',
        estimatedTime: generateModel ? '1-3 minutes' : '5-10 seconds',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/spec-only', sensitiveWriteRateLimiter, authRequestHandler, async (req: Request, res: Response): Promise<void> => {
    try {
      const { input } = req.body as { input: string };
      if (!input || typeof input !== 'string') {
        res.status(400).json({ error: 'input is required' });
        return;
      }

      const userId = (req as any).userId || (req as any).playerId || 'anonymous';
      const pipeline = getAssetPipeline();
      const jobId = await pipeline.startPipeline(userId, input.trim(), {
        generateModel: false,
        autoRegister: false,
      });

      res.json({ jobId, message: 'Spec generation started.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/job/:jobId', adminRateLimiter, authRequestHandler, (req: Request, res: Response): void => {
    const userId = (req as any).userId || (req as any).playerId || 'anonymous';
    const jobId = String(req.params['jobId']);
    const pipeline = getAssetPipeline();
    const job = pipeline.getJob(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(job);
  });

  router.get('/jobs', adminRateLimiter, authRequestHandler, (req: Request, res: Response): void => {
    const userId = (req as any).userId || (req as any).playerId || 'anonymous';
    const pipeline = getAssetPipeline();
    const jobs = pipeline.getAllJobs(userId);
    res.json({ jobs });
  });

  router.get('/assets', adminRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query['limit']) || 50, 200);
      const offset = Number(req.query['offset']) || 0;
      const assetClass = typeof req.query['assetClass'] === 'string' ? req.query['assetClass'] : undefined;

      let query = 'SELECT * FROM generated_assets';
      const params: any[] = [];

      if (assetClass) {
        query += ' WHERE asset_class = $1';
        params.push(assetClass);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      res.json({ assets: result.rows, total: result.rows.length });
    } catch {
      res.json({ assets: [], total: 0 });
    }
  });

  router.delete('/asset/:id', sensitiveWriteRateLimiter, authRequestHandler, async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId || (req as any).playerId || 'anonymous';
      const id = String(req.params['id']);
      const result = await db.query('DELETE FROM generated_assets WHERE id = $1 AND created_by = $2', [id, userId]);

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Asset not found or access denied' });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/spec/:specId', adminRateLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const specId = String(req.params['specId']);
      const result = await db.query('SELECT * FROM asset_specifications WHERE id = $1', [specId]);
      if (!result.rows || result.rows.length === 0) {
        res.status(404).json({ error: 'Spec not found' });
        return;
      }
      const row = result.rows[0];
      const spec = typeof row.specification === 'string'
        ? JSON.parse(row.specification)
        : row.specification;
      res.json({
        id: row.id,
        assetName: row.asset_name,
        assetClass: row.asset_class,
        style: row.style,
        createdAt: row.created_at,
        specification: spec,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/tripo/balance', adminRateLimiter, async (_req: Request, res: Response): Promise<void> => {
    try {
      const apiKey = process.env['TRIPO_API_KEY'];
      if (!apiKey) {
        res.status(503).json({ error: 'TRIPO_API_KEY not configured' });
        return;
      }

      const response = await fetch('https://api.tripo3d.ai/v2/openapi/user/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json() as any;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
