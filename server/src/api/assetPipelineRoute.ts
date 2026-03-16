/**
 * Asset Pipeline API Routes
 * Full End-to-End: Text → Spec → Tripo3D → GLB → Game Registry
 *
 * POST /api/pipeline/generate        – Start full pipeline (spec + model + register)
 * POST /api/pipeline/spec-only       – Generate spec only (no 3D model)
 * GET  /api/pipeline/job/:jobId      – Poll job status
 * GET  /api/pipeline/jobs            – List user's pipeline jobs
 * POST /api/pipeline/register/:jobId – Manually register completed job into game
 * GET  /api/pipeline/assets          – List all generated assets
 * DELETE /api/pipeline/asset/:id     – Delete a generated asset
 */

import { Router, Request, Response } from 'express';
import { getAssetPipeline } from '../modules/asset-brain/AssetPipeline.js';
import { db } from '../core/Database.js';

export function createAssetPipelineRouter(): Router {
  const router = Router();

  // ── POST /api/pipeline/generate ───────────────────────────────────────────
  /**
   * Start full pipeline: spec → 3D model → register in game
   * Body: { input: string, generateModel?: boolean, autoRegister?: boolean }
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const { input, generateModel = true, autoRegister = true } = req.body as {
        input: string;
        generateModel?: boolean;
        autoRegister?: boolean;
      };

      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return res.status(400).json({ error: 'input is required' });
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

  // ── POST /api/pipeline/spec-only ──────────────────────────────────────────
  /**
   * Generate specification only (fast, no 3D model)
   * Body: { input: string }
   */
  router.post('/spec-only', async (req: Request, res: Response) => {
    try {
      const { input } = req.body as { input: string };
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'input is required' });
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

  // ── GET /api/pipeline/job/:jobId ──────────────────────────────────────────
  /**
   * Poll job status
   */
  router.get('/job/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params['jobId']);
    const pipeline = getAssetPipeline();
    const job = pipeline.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  });

  // ── GET /api/pipeline/jobs ────────────────────────────────────────────────
  /**
   * List user's pipeline jobs
   */
  router.get('/jobs', (req: Request, res: Response) => {
    const userId = (req as any).userId || (req as any).playerId || 'anonymous';
    const pipeline = getAssetPipeline();
    const jobs = pipeline.getAllJobs(userId);
    res.json({ jobs });
  });

  // ── GET /api/pipeline/assets ──────────────────────────────────────────────
  /**
   * List all generated assets from DB
   */
  router.get('/assets', async (req: Request, res: Response) => {
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
    } catch (error: any) {
      // Table might not exist yet
      res.json({ assets: [], total: 0 });
    }
  });

  // ── DELETE /api/pipeline/asset/:id ────────────────────────────────────────
  /**
   * Delete a generated asset
   */
  router.delete('/asset/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params['id']);
      await db.query('DELETE FROM generated_assets WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/pipeline/tripo/balance ───────────────────────────────────────
  /**
   * Check Tripo3D account balance
   */
  router.get('/tripo/balance', async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env['TRIPO_API_KEY'];
      if (!apiKey) return res.status(503).json({ error: 'TRIPO_API_KEY not configured' });

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
