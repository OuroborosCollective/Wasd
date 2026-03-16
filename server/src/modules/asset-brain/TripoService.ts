/**
 * Tripo3D API Service
 * Handles 3D model generation from text/image prompts
 * API Docs: https://platform.tripo3d.ai/docs
 */

export interface TripoTextToModelOptions {
  prompt: string;
  negativePrompt?: string;
  modelVersion?: 'v2.0-20240919' | 'v2.5-20250123';
  faceLimit?: number;
  texture?: boolean;
  pbr?: boolean;
  textureQuality?: 'standard' | 'detailed';
  style?: 'person:realistic' | 'person:anime' | 'object:realistic' | 'object:voxel';
}

export interface TripoTask {
  taskId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  progress?: number;
  result?: {
    model?: { url: string; type: string };
    rendered_image?: { url: string };
    pbr_model?: { url: string };
  };
  error?: string;
}

export interface TripoGenerationResult {
  taskId: string;
  glbUrl: string;
  thumbnailUrl?: string;
  status: 'success' | 'failed';
  error?: string;
}

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3 min max

export class TripoService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${TRIPO_API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tripo3D API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Submit a text-to-3D task
   */
  async createTextToModelTask(options: TripoTextToModelOptions): Promise<string> {
    const payload: Record<string, unknown> = {
      type: 'text_to_model',
      prompt: options.prompt,
      model_version: options.modelVersion ?? 'v2.5-20250123',
      face_limit: options.faceLimit ?? 10000,
      texture: options.texture ?? true,
      pbr: options.pbr ?? true,
      texture_quality: options.textureQuality ?? 'detailed',
    };

    if (options.negativePrompt) payload['negative_prompt'] = options.negativePrompt;
    if (options.style) payload['style'] = options.style;

    const data = await this.request<{ code: number; data: { task_id: string } }>(
      'POST',
      '/task',
      payload
    );

    if (data.code !== 0) {
      throw new Error(`Tripo3D task creation failed: code ${data.code}`);
    }

    return data.data.task_id;
  }

  /**
   * Poll task status until complete
   */
  async pollTask(taskId: string): Promise<TripoTask> {
    const data = await this.request<{
      code: number;
      data: {
        task_id: string;
        status: string;
        progress?: number;
        output?: {
          model?: { url: string; type: string };
          rendered_image?: { url: string };
          pbr_model?: { url: string };
        };
        message?: string;
      };
    }>('GET', `/task/${taskId}`);

    if (data.code !== 0) {
      throw new Error(`Tripo3D poll failed: code ${data.code}`);
    }

    const d = data.data;
    
    // Debug: Log full response when success but no output
    if (d.status === 'success' && !d.output) {
      console.warn('[TripoService] Task success but no output. Full response:', JSON.stringify(d));
    }
    
    return {
      taskId: d.task_id,
      status: d.status as TripoTask['status'],
      progress: d.progress,
      result: d.output
        ? {
            model: d.output.model,
            rendered_image: d.output.rendered_image,
            pbr_model: d.output.pbr_model,
          }
        : undefined,
      error: d.message,
    };
  }

  /**
   * Generate a 3D model from text and wait for completion
   */
  async generateFromText(
    options: TripoTextToModelOptions,
    onProgress?: (progress: number, status: string) => void
  ): Promise<TripoGenerationResult> {
    // Submit task
    const taskId = await this.createTextToModelTask(options);
    onProgress?.(5, 'queued');

    // Poll until done
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      attempts++;

      const task = await this.pollTask(taskId);
      onProgress?.(task.progress ?? 0, task.status);

      if (task.status === 'success') {
        const glbUrl = task.result?.pbr_model?.url ?? task.result?.model?.url;
        if (!glbUrl) {
          return { taskId, glbUrl: '', status: 'failed', error: 'No model URL in result' };
        }
        return {
          taskId,
          glbUrl,
          thumbnailUrl: task.result?.rendered_image?.url,
          status: 'success',
        };
      }

      if (task.status === 'failed' || task.status === 'cancelled') {
        return {
          taskId,
          glbUrl: '',
          status: 'failed',
          error: task.error ?? `Task ${task.status}`,
        };
      }
    }

    return { taskId, glbUrl: '', status: 'failed', error: 'Timeout after 3 minutes' };
  }

  /**
   * Build an optimized prompt for MMORPG assets
   */
  static buildGamePrompt(
    assetName: string,
    assetClass: string,
    style: string,
    spec?: Record<string, unknown>
  ): { prompt: string; negativePrompt: string; style?: string } {
    const styleMap: Record<string, string> = {
      realistic: 'highly detailed, photorealistic, game-ready',
      stylized: 'stylized, hand-painted, cartoon, vibrant colors',
      'sci-fi': 'futuristic, sci-fi, metallic, glowing elements',
      fantasy: 'fantasy, magical, ornate, epic',
      lowpoly: 'low poly, geometric, minimalist',
      anime: 'anime style, cel-shaded',
    };

    const classMap: Record<string, string> = {
      character: 'full body character, humanoid, standing pose, T-pose',
      creature: 'creature, full body, standing pose',
      weapon: 'weapon, isolated, no background',
      prop: 'prop, object, isolated, no background',
      environment: 'environment piece, modular, game asset',
    };

    const styleDesc = styleMap[style] ?? 'game-ready, detailed';
    const classDesc = classMap[assetClass] ?? 'game asset';

    const prompt = `${assetName}, ${classDesc}, ${styleDesc}, MMORPG game asset, clean topology, PBR textures, white background`;

    const negativePrompt =
      'blurry, low quality, deformed, extra limbs, floating parts, disconnected geometry, bad topology, artifacts, watermark, text';

    // Tripo style hint
    let tripoStyle: string | undefined;
    if (assetClass === 'character' && style === 'realistic') tripoStyle = 'person:realistic';
    if (assetClass === 'character' && style === 'anime') tripoStyle = 'person:anime';

    return { prompt, negativePrompt, style: tripoStyle };
  }
}

// Singleton factory
let _tripoService: TripoService | null = null;

export function getTripoService(): TripoService {
  const apiKey = process.env['TRIPO_API_KEY'];
  if (!apiKey) throw new Error('TRIPO_API_KEY environment variable not set');
  if (!_tripoService) _tripoService = new TripoService(apiKey);
  return _tripoService;
}
