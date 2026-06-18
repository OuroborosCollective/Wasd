import { Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { makeStackedSprite, supportsStack } from "./stackedSprite";
import type { AssetEntry } from "./assetManifest";
import type { VisualSignature } from "./world/VisualSignature";

export interface VisualCropPolicy {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly paddingX: number;
  readonly paddingY: number;
  readonly shadowOffsetY: number;
}

const CROP_POLICIES: Record<string, VisualCropPolicy> = {
  tile_iso_96x48_anchor_center: { anchorX: 0.5, anchorY: 0.5, paddingX: 0, paddingY: 0, shadowOffsetY: 0 },
  building_foot_anchor_bottom_center: { anchorX: 0.5, anchorY: 1, paddingX: 6, paddingY: 8, shadowOffsetY: 16 },
  actor_foot_anchor_bottom_center: { anchorX: 0.5, anchorY: 1, paddingX: 2, paddingY: 2, shadowOffsetY: 12 },
  prop_tree_canopy_anchor_trunk: { anchorX: 0.5, anchorY: 1, paddingX: 4, paddingY: 6, shadowOffsetY: 18 },
  prop_object_anchor_bottom_center: { anchorX: 0.5, anchorY: 1, paddingX: 2, paddingY: 2, shadowOffsetY: 16 },
};

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function resolveVisualCropPolicy(visualSignature: Pick<VisualSignature, "cropProfileId"> | null | undefined): VisualCropPolicy {
  const profile = visualSignature?.cropProfileId ? CROP_POLICIES[visualSignature.cropProfileId] : null;
  if (!profile) return CROP_POLICIES.prop_object_anchor_bottom_center;
  return {
    anchorX: clamp01(profile.anchorX, 0.5),
    anchorY: clamp01(profile.anchorY, 1),
    paddingX: Math.max(0, Math.trunc(profile.paddingX)),
    paddingY: Math.max(0, Math.trunc(profile.paddingY)),
    shadowOffsetY: Math.trunc(profile.shadowOffsetY),
  };
}

/**
 * Checks if an entry is from an external ISO pack that may have white matte backgrounds.
 * These sprites should use multiply blending to neutralize white backgrounds.
 */
function isExternalIsoPack(entry: AssetEntry | null | undefined): boolean {
  if (!entry) return false;
  const srcLower = entry.src.toLowerCase();
  const tagsLower = (entry.tags ?? []).map((tag: string) => tag.toLowerCase());

  // Check for external pack indicators
  const externalIndicators = [
    '/client2d-assets/graphicriver-iso/',
    '/2d-assets/graphicriver/',
    'graphicriver',
    'kenney',
    'pipoya',
    'isometric',
    'iso-pack'
  ];

  return externalIndicators.some(indicator => srcLower.includes(indicator)) ||
         tagsLower.some(tag => externalIndicators.some(ind => tag.includes(ind)));
}

function propTextureFor(entry: AssetEntry, texture: Texture): Texture {
  const frame = entry.frame;
  if (!frame) return texture;
  if (![frame.x, frame.y, frame.w, frame.h].every(Number.isFinite)) return texture;
  if (frame.w <= 0 || frame.h <= 0) return texture;

  return new Texture({
    source: texture.source,
    frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
  });
}

export function make2dProp(
  entry: AssetEntry | null | undefined,
  texture: Texture | null | undefined,
  fallback: () => Container,
  width: number,
  height: number,
  visualSignature?: Pick<VisualSignature, "cropProfileId"> | null,
): Container {
  if (!entry || !texture) return fallback();
  const crop = resolveVisualCropPolicy(visualSignature);
  const propTexture = propTextureFor(entry, texture);
  if (supportsStack(entry)) return makeStackedSprite(propTexture, entry, { width, height, layerStep: 3 });
  const root = new Container();
  const shadow = entry.shadow;
  const shadowWidth = shadow?.w ?? entry.isoFootprint?.w ?? width * 0.72;
  const shadowHeight = shadow?.h ?? entry.isoFootprint?.h ?? Math.max(6, height * 0.12);
  root.addChild(new Graphics().ellipse(0, crop.shadowOffsetY, shadowWidth * 0.5, shadowHeight * 0.5).fill({ color: 0x010804, alpha: shadow?.alpha ?? 0.42 }));
  const sprite = new Sprite(propTexture);
  sprite.anchor.set(crop.anchorX, crop.anchorY);
  sprite.width = Math.max(1, width + crop.paddingX * 2);
  sprite.height = Math.max(1, height + crop.paddingY * 2);

  // Apply multiply blend mode for external ISO pack sprites to neutralize white matte backgrounds
  // PIXI v8 uses string values for blend modes
  if (isExternalIsoPack(entry)) {
    sprite.blendMode = "multiply" as any;
  }

  root.addChild(sprite);
  return root;
}
