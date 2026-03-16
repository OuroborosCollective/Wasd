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
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { db as dbInstance } from '../core/Database.js';
import { AssetBrainDatabase } from '../modules/asset-brain/AssetBrainDatabase.js';
import { generateAssetSpecification, generateVariants } from '../modules/asset-brain/assetBrainEngine.js';

type Database = typeof dbInstance;

export function createAssetBrainRouter(dbParam?: any): Router {
  const db = dbParam || dbInstance;
  const assetBrainDb = new AssetBrainDatabase(db);
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

      const { assetInput, name, style, tags, description, isPublic } = req.body;

      if (!assetInput || typeof assetInput !== 'string') {
        return res.status(400).json({ error: 'assetInput is required and must be a string' });
      }

      // Generate specification using Asset Brain Engine
      const specification = await generateAssetSpecification(assetInput);

      // Save to database
      const savedSpec = await assetBrainDb.createSpecification({
        userId,
        assetName: name || specification.assetName,
        assetClass: specification.assetClass,
        style: style || specification.style,
        usage: specification.usage,
        description,
        tags,
        platformProfiles: specification.platformProfiles,
        dimensions: specification.dimensions,
        topology: specification.topology,
        uv: specification.uv,
        materials: specification.materials,
        rig: specification.rig,
        animations: specification.animations,
        lods: specification.lods,
        collision: specification.collision,
        attachments: specification.attachments,
        export: specification.export,
        fileContract: specification.fileContract,
        qa: specification.qa,
        autoDecisions: specification.autoDecisions,
        isPublic: isPublic || false,
      });

      // Generate variants
      const variants = generateVariants(specification);

      // Save variants
      const savedVariants = [];
      for (const [variantType, variantData] of Object.entries(variants)) {
        const savedVariant = await assetBrainDb.createVariant({
          specificationId: savedSpec.id,
          variantType: variantType as 'hero' | 'gameplay' | 'mobileweb',
          triangleCount: (variantData as any).topology?.triangleCount || 0,
          boneCount: (variantData as any).rig?.boneCount,
          textureResolution: (variantData as any).materials?.textureResolution || '2K',
          description: `${variantType} optimized variant`,
        });
        savedVariants.push(savedVariant);
      }

      res.json({
        success: true,
        specification: savedSpec,
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
      const { id } = req.params;
      const spec = await assetBrainDb.getSpecification(id);

      if (!spec) {
        return res.status(404).json({ error: 'Specification not found' });
      }

      // Check if user has access (public or owner)
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
      const { id } = req.params;
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
      const { assetClass, style } = req.query;
      const specs = await assetBrainDb.searchSpecifications(
        assetClass as string,
        style as string
      );
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
      const { assetClass, style } = req.query;
      const entries = await assetBrainDb.searchLibrary(
        assetClass as string,
        style as string
      );
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

      const { jobType, inputFile } = req.body;

      if (!['csv-import', 'json-import', 'batch-generate'].includes(jobType)) {
        return res.status(400).json({ error: 'Invalid job type' });
      }

      const job = await assetBrainDb.createBatchJob({
        userId,
        jobType,
        status: 'pending',
        inputFile,
        assetsGenerated: 0,
        errors: [],
      });

      // TODO: Start async batch processing job
      // For now, just return the job ID

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
      const userId = (req as any).userId || (req as any).playerId;

      // TODO: Fetch job from database and verify ownership
      res.json({ jobId: id, status: 'pending', assetsGenerated: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
