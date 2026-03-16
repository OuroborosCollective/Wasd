/**
 * Asset Pipeline Orchestrator
 * Connects: Asset Brain Spec → Tripo3D Generation → GLB Registry
 *
 * Full flow:
 *   text input → LLM spec → Tripo3D 3D model → download GLB → register in game
 */

import { generateAssetSpecification } from './assetBrainEngine.js';
import { AssetBrainDatabase } from './AssetBrainDatabase.js';
import { TripoService, getTripoService } from './TripoService.js';
import type { AssetSpecification } from './assetBrainEngine.js';
import { db } from '../../core/Database.js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export type PipelineStatus =
  | 'pending'
  | 'generating_spec'
  | 'spec_ready'
  | 'generating_model'
  | 'downloading_glb'
  | 'registering'
  | 'complete'
  | 'failed';

export interface PipelineJob {
  jobId: string;
  userId: string;
  input: string;
  status: PipelineStatus;
  progress: number;
  specId?: string;
  tripoTaskId?: string;
  glbUrl?: string;
  glbLocalPath?: string;
  registryId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineResult {
  jobId: string;
  spec: AssetSpecification;
  glbUrl: string;
  thumbnailUrl?: string;
  registryId: string;
  status: 'complete' | 'failed';
  error?: string;
}

// In-memory job store (could be moved to DB)
const pipelineJobs = new Map<string, PipelineJob>();

export class AssetPipeline {
  private db: AssetBrainDatabase;
  private tripo: TripoService;

  constructor() {
    this.db = new AssetBrainDatabase(db);
    this.tripo = getTripoService();
  }

  /**
   * Start a full pipeline job asynchronously
   * Returns jobId immediately, use getJob() to poll status
   */
  async startPipeline(
    userId: string,
    input: string,
    options?: { generateModel?: boolean; autoRegister?: boolean }
  ): Promise<string> {
    const jobId = `pipe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: PipelineJob = {
      jobId,
      userId,
      input,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pipelineJobs.set(jobId, job);

    // Run async without blocking
    this.runPipeline(job, options).catch((err) => {
      job.status = 'failed';
      job.error = String(err);
      job.updatedAt = new Date();
    });

    return jobId;
  }

  getJob(jobId: string): PipelineJob | null {
    return pipelineJobs.get(jobId) ?? null;
  }

  getAllJobs(userId: string): PipelineJob[] {
    return Array.from(pipelineJobs.values())
      .filter((j) => j.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private update(job: PipelineJob, patch: Partial<PipelineJob>) {
    Object.assign(job, patch, { updatedAt: new Date() });
  }

  private async runPipeline(
    job: PipelineJob,
    options?: { generateModel?: boolean; autoRegister?: boolean }
  ): Promise<void> {
    const generateModel = options?.generateModel ?? true;
    const autoRegister = options?.autoRegister ?? true;

    try {
      // ── Step 1: Generate Specification ────────────────────────────────────
      this.update(job, { status: 'generating_spec', progress: 10 });

      const spec = await generateAssetSpecification(job.input);
      const specRecord = await this.db.createSpecification({
        userId: job.userId,
        assetName: spec.assetName,
        assetClass: spec.assetClass,
        style: spec.style,
        usage: 'game',
        description: `Generated from: ${job.input}`,
        tags: [spec.assetClass, spec.style],
        specification: JSON.stringify(spec),
        isPublic: false,
      });

      this.update(job, { status: 'spec_ready', progress: 30, specId: specRecord.id });

      if (!generateModel) {
        this.update(job, { status: 'complete', progress: 100 });
        return;
      }

      // ── Step 2: Generate 3D Model via Tripo3D ─────────────────────────────
      this.update(job, { status: 'generating_model', progress: 35 });

      const { prompt, negativePrompt, style: tripoStyle } = TripoService.buildGamePrompt(
        spec.assetName,
        spec.assetClass,
        spec.style
      );

      const result = await this.tripo.generateFromText(
        {
          prompt,
          negativePrompt,
          style: tripoStyle as any,
          faceLimit: this.getFaceLimit(spec),
          texture: true,
          pbr: true,
          textureQuality: 'detailed',
        },
        (progress, status) => {
          this.update(job, {
            progress: 35 + Math.floor(progress * 0.45),
            tripoTaskId: job.tripoTaskId,
          });
        }
      );

      if (result.status === 'failed') {
        throw new Error(`Tripo3D generation failed: ${result.error}`);
      }

      this.update(job, {
        tripoTaskId: result.taskId,
        glbUrl: result.glbUrl,
        progress: 80,
        status: 'downloading_glb',
      });

      // ── Step 3: Download GLB locally ──────────────────────────────────────
      const localPath = await this.downloadGlb(result.glbUrl, spec.assetName, spec.assetClass);
      this.update(job, { glbLocalPath: localPath, progress: 90 });

      if (!autoRegister) {
        this.update(job, { status: 'complete', progress: 100 });
        return;
      }

      // ── Step 4: Register in Wasd GLB Registry ─────────────────────────────
      this.update(job, { status: 'registering', progress: 92 });

      const registryId = await this.registerInGame(
        spec,
        localPath,
        result.glbUrl,
        result.thumbnailUrl
      );

      this.update(job, {
        registryId,
        status: 'complete',
        progress: 100,
      });
    } catch (err) {
      this.update(job, {
        status: 'failed',
        error: String(err),
      });
      throw err;
    }
  }

  /**
   * Determine face limit based on spec platform targets
   */
  private getFaceLimit(spec: AssetSpecification): number {
    const targets = (spec as any).platformTargets as string[] | undefined;
    if (targets?.includes('pc_high')) return 15000;
    if (targets?.includes('android')) return 5000;
    return 10000; // browser MMO default
  }

  /**
   * Download GLB from Tripo CDN to local server directory
   */
  private downloadGlb(url: string, assetName: string, assetClass: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const safeName = assetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const dir = path.join(process.cwd(), 'public', 'models', 'generated', assetClass);
      fs.mkdirSync(dir, { recursive: true });

      const filename = `${safeName}_${Date.now()}.glb`;
      const filepath = path.join(dir, filename);
      const file = fs.createWriteStream(filepath);

      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          // Return relative path for serving
          resolve(`/models/generated/${assetClass}/${filename}`);
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Register the generated GLB in the Wasd game systems
   */
  private async registerInGame(
    spec: AssetSpecification,
    localPath: string,
    remoteUrl: string,
    thumbnailUrl?: string
  ): Promise<string> {
    const registryId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Insert into generated_assets table
    await db.query(
      `INSERT INTO generated_assets
        (id, asset_name, asset_class, style, glb_path, glb_remote_url, thumbnail_url, spec_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        registryId,
        spec.assetName,
        spec.assetClass,
        spec.style,
        localPath,
        remoteUrl,
        thumbnailUrl ?? null,
        JSON.stringify(spec),
      ]
    );

    // Also register in the existing GLB registry based on asset class
    if (spec.assetClass === 'character') {
      await this.registerAsCharacterBody(spec, localPath, registryId);
    } else {
      await this.registerAsProp(spec, localPath, registryId);
    }

    return registryId;
  }

  private async registerAsCharacterBody(
    spec: AssetSpecification,
    localPath: string,
    registryId: string
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO character_bodies (id, name, glb_path, style, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          registryId,
          spec.assetName,
          localPath,
          spec.style,
          JSON.stringify([spec.assetClass, spec.style, 'generated', 'ai']),
        ]
      );
    } catch {
      // Table may not exist yet — non-fatal
    }
  }

  private async registerAsProp(
    spec: AssetSpecification,
    localPath: string,
    registryId: string
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO prop_registry (id, name, glb_path, asset_class, style, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          registryId,
          spec.assetName,
          localPath,
          spec.assetClass,
          spec.style,
          JSON.stringify([spec.assetClass, spec.style, 'generated', 'ai']),
        ]
      );
    } catch {
      // Table may not exist yet — non-fatal
    }
  }
}

// Singleton
let _pipeline: AssetPipeline | null = null;
export function getAssetPipeline(): AssetPipeline {
  if (!_pipeline) _pipeline = new AssetPipeline();
  return _pipeline;
}
