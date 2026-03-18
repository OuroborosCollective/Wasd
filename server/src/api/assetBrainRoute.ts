/**
 * Asset Brain Architect API Routes
 * POST   /api/asset-brain/generate      – Generate asset specification from input
 * GET    /api/asset-brain/my-specs      – Get user's specifications
 * GET    /api/asset-brain/specs/:id     – Get specification details
 * GET    /api/asset-brain/variants/:id  – Get variants for specification
 * GET    /api/asset-brain/search        – Search public specifications
 * GET    /api/asset-brain/library       – Browse asset library
 * POST   /api/asset-brain/batch         – Start batch job
 * GET    /api/asset-brain/batch/:id     – Get batch job status
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { db as dbInstance } from '../core/Database.js';
import { AssetBrainDatabase, type AssetRecord } from '../modules/asset-brain/AssetBrainDatabase.js';
import { generateAssetSpecification, generateVariants } from '../modules/asset-brain/assetBrainEngine.js';

export function createAssetBrainRouter(dbParam?: unknown): Router {
  const db = dbParam ?? dbInstance;
  const assetBrainDb = new AssetBrainDatabase(db as typeof dbInstance);
  const router = Router();

  // Initialize tables on startup
  assetBrainDb.initializeTables().catch(console.error);

  /**
   * POST /api/asset-brain/generate
   * Generate asset specification from text input
   */
  router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || (req as any).playerId;
      if (!userId) return res.status(401).json({ error: 'User ID required' });

      const { assetInput, name, style, tags, description, isPublic } = req.body as {
        assetInput?: string;
        name?: string;
        style?: string;
        tags?: string[];
        description?: string;
        isPublic?: boolean;
      };

      if (!assetInput || typeof assetInput !== 'string') {
        return res.status(400).json({ error: 'assetInput is required and must be a string' });
      }

      // Generate specification using Asset Brain Engine
      const specification = await generateAssetSpecification(assetInput);

      // Save to database (store full spec as JSON blob)
      const savedSpec = await assetBrainDb.createSpecification({
        userId,
        assetName: name ?? specification.assetName,
        assetClass: specification.assetClass,
        style: style ?? specification.style,
        usage: specification.usage,
        description,
        tags,
        specification: JSON.stringify(specification),
        isPublic: isPublic ?? false,
      });

      // Generate variants
      const variants = generateVariants(specification);

      // Save variants
      const savedVariants: unknown[] = [];
      for (const [variantType, variantData] of Object.entries(variants)) {
        const topology = (variantData as any).topology;
        const rig = (variantData as any).rig;
        const triangleCount = topology?.triangleBudget?.mid ?? topology?.triangleBudget?.high ?? 0;
        const boneCount = rig?.boneCountTargets?.mid ?? undefined;
        const savedVariant = await assetBrainDb.createVariant({
          specificationId: savedSpec.id,
          variantType: variantType as 'hero' | 'gameplay' | 'mobileweb',
          triangleCount,
          boneCount,
          textureResolution: '2K',
          description: `${variantType} optimized variant`,
        });
        savedVariants.push(savedVariant);
      }

      res.json({
        success: true,
        specification: { ...savedSpec, parsedSpec: specification },
        variants: savedVariants,
      });
    } catch (error: any) {
      console.error('Asset generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate asset specification' });
    }
  });

  /**
   * GET /api/asset-brain/my-specs
   * Get user's asset specifications
   */
  router.get('/my-specs', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || (req as any).playerId;
      if (!userId) return res.status(401).json({ error: 'User ID required' });
      const specs = await assetBrainDb.getUserSpecifications(userId);
      res.json({ specifications: specs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/asset-brain/specs/:id
   * Get specification details
   */
  router.get('/specs/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params['id']);
      const spec = await assetBrainDb.getSpecification(id);
      if (!spec) {
        return res.status(404).json({ error: 'Specification not found' });
      }
      const userId = (req as any).userId || (req as any).playerId;
      if (!spec.isPublic && spec.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({ specification: spec });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/asset-brain/variants/:id
   * Get variants for a specification
   */
  router.get('/variants/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params['id']);
      const variants = await assetBrainDb.getVariants(id);
      res.json({ variants });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/asset-brain/search
   * Search public specifications
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const assetClass = typeof req.query.assetClass === 'string' ? req.query.assetClass : undefined;
      const style = typeof req.query.style === 'string' ? req.query.style : undefined;
      const specs = await assetBrainDb.searchSpecifications(assetClass, style);
      res.json({ specifications: specs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/asset-brain/library
   * Browse asset library
   */
  router.get('/library', async (req: Request, res: Response) => {
    try {
      const assetClass = typeof req.query.assetClass === 'string' ? req.query.assetClass : undefined;
      const style = typeof req.query.style === 'string' ? req.query.style : undefined;
      const entries = await assetBrainDb.searchLibrary(assetClass, style);
      res.json({ library: entries });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/asset-brain/batch
   * Start batch job for CSV/JSON import
   */
  router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId || (req as any).playerId;
      if (!userId) return res.status(401).json({ error: 'User ID required' });
      const { jobType, inputFile } = req.body as { jobType?: string; inputFile?: string };
      if (!jobType || !['csv-import', 'json-import', 'batch-generate'].includes(jobType)) {
        return res.status(400).json({ error: 'Invalid job type' });
      }
      const job = await assetBrainDb.createBatchJob({
        userId,
        jobType: jobType as 'csv-import' | 'json-import' | 'batch-generate',
        status: 'pending',
        inputFile: inputFile ?? '',
        assetsGenerated: 0,
        errors: [],
      });
      res.json({ success: true, jobId: job.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/asset-brain/batch/:id
   * Get batch job status
   */
  router.get('/batch/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      res.json({ jobId: id, status: 'pending', assetsGenerated: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
