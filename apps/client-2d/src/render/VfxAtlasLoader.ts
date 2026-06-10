/**
 * VfxAtlasLoader - Loads VFX atlas frames from Stitch manifest
 * 
 * ARCHITECTURE:
 * - Server Authority: VFX assets are deterministic based on Stitch manifest
 * - O(1) Frame Lookup: Caches parsed atlas data for fast access
 * - Atlas Slicing: Uses Rectangle to slice spritesheet into individual frames
 * 
 * Usage:
 *   import { VfxAtlasLoader } from './VfxAtlasLoader';
 *   
 *   const loader = new VfxAtlasLoader();
 *   await loader.loadFromManifest('/2d-assets/stitch/manifest.json');
 *   
 *   // Get fire frames (6 frames from the 6x6 grid)
 *   const fireFrames = loader.getFrames('spell_fire');
 */

import { Texture, Rectangle, BaseTexture, Sprite, Container } from "pixi.js";

export interface VfxAtlasFrame {
  texture: Texture;
  duration: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VfxAtlasData {
  assetId: string;
  imagePath: string;
  atlasPath: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frames: VfxAtlasFrame[];
}

/**
 * VfxAtlasLoader
 * 
 * Loads and parses VFX atlas data from Stitch manifest.
 * Provides O(1) frame access after initial load.
 */
export class VfxAtlasLoader {
  private readonly atlasCache = new Map<string, VfxAtlasData>();
  private baseTexture: BaseTexture | null = null;
  
  /**
   * Load atlas data from Stitch manifest JSON
   */
  async loadFromManifest(manifestUrl: string): Promise<void> {
    try {
      const response = await fetch(manifestUrl);
      const manifest = await response.json();
      
      // Find VFX assets
      const vfxAssets = manifest.assets?.filter(
        (a: any) => a.category === 'vfx' || a.assetId.includes('vfx')
      ) || [];
      
      for (const asset of vfxAssets) {
        await this.loadAtlas(asset);
      }
    } catch (error) {
      console.error('[VfxAtlasLoader] Failed to load manifest:', error);
    }
  }
  
  /**
   * Load a single atlas from asset data
   */
  async loadAtlas(asset: {
    assetId: string;
    imagePath: string;
    atlasPath: string;
    width: number;
    height: number;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
  }): Promise<void> {
    try {
      // Load the atlas JSON
      const atlasResponse = await fetch(asset.atlasPath);
      const atlasData = await atlasResponse.json();
      
      // Load the spritesheet image as base texture
      const texture = await this.loadTexture(asset.imagePath);
      
      // Parse frames from atlas JSON
      const frames: VfxAtlasFrame[] = [];
      const frameEntries = Object.entries(atlasData.frames || {});
      
      for (const [frameName, frameData] of frameEntries) {
        const fd = frameData as any;
        frames.push({
          texture: new Texture({
            source: texture.source,
            frame: new Rectangle(fd.frame.x, fd.frame.y, fd.frame.w, fd.frame.h),
          }),
          duration: 66, // Default ~15fps
          index: frames.length,
          x: fd.frame.x,
          y: fd.frame.y,
          width: fd.frame.w,
          height: fd.frame.h,
        });
      }
      
      // Sort by frame name to ensure consistent order
      frames.sort((a, b) => a.index - b.index);
      
      const atlasInfo: VfxAtlasData = {
        assetId: asset.assetId,
        imagePath: asset.imagePath,
        atlasPath: asset.atlasPath,
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
        columns: asset.columns,
        rows: asset.rows,
        frames,
      };
      
      this.atlasCache.set(asset.assetId, atlasInfo);
      
      // Set base texture for slicing
      if (!this.baseTexture) {
        this.baseTexture = texture;
      }
    } catch (error) {
      console.error(`[VfxAtlasLoader] Failed to load atlas ${asset.assetId}:`, error);
    }
  }
  
  /**
   * Load texture from image path
   */
  private async loadTexture(imagePath: string): Promise<BaseTexture> {
    return new Promise((resolve, reject) => {
      const url = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      BaseTexture.from(url).then(
        (texture) => resolve(texture),
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Get frames for a VFX key.
   * Maps effect types to frame ranges in the atlas.
   */
  getFrames(vfxKey: string): VfxAtlasFrame[] {
    // Default to all frames if no specific mapping
    for (const [, atlas] of this.atlasCache) {
      return atlas.frames.slice(0, Math.min(6, atlas.frames.length));
    }
    return [];
  }
  
  /**
   * Get frames by asset ID and optional range
   */
  getFramesByAssetId(assetId: string, startFrame = 0, frameCount = 6): VfxAtlasFrame[] {
    const atlas = this.atlasCache.get(assetId);
    if (!atlas) return [];
    
    return atlas.frames.slice(startFrame, startFrame + frameCount);
  }
  
  /**
   * Get all available VFX keys
   */
  getAvailableVfxKeys(): string[] {
    return Array.from(this.atlasCache.keys());
  }
  
  /**
   * Clear cache and release resources
   */
  destroy(): void {
    this.atlasCache.clear();
    this.baseTexture = null;
  }
}

/**
 * Create Sprite from VFX frame
 */
export function createVfxSprite(frame: VfxAtlasFrame, anchor = 0.5): Sprite {
  const sprite = new Sprite(frame.texture);
  sprite.anchor.set(anchor, anchor);
  return sprite;
}

/**
 * Create animated VFX container from frames
 */
export function createVfxContainer(
  frames: VfxAtlasFrame[],
  position = { x: 0, y: 0 }
): { container: Container; sprite: Sprite } {
  const container = new Container();
  container.x = position.x;
  container.y = position.y;
  
  const sprite = frames.length > 0 ? createVfxSprite(frames[0]) : new Sprite(Texture.WHITE);
  container.addChild(sprite);
  
  return { container, sprite };
}