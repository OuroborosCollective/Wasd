import { Rectangle, Texture } from "pixi.js";
import type { AssetEntry } from "./assetManifest";

type StitchAtlasFrame = {
  frame?: { x: number; y: number; w: number; h: number };
};

type StitchAtlasPayload = {
  frames?: Record<string, StitchAtlasFrame>;
};

type AtlasBackedAssetEntry = AssetEntry & {
  atlas?: string;
};

export function atlasUrlFor(entry: AssetEntry | null | undefined): string | null {
  return (entry as AtlasBackedAssetEntry | null | undefined)?.atlas ?? null;
}

async function loadAtlasPayload(url: string): Promise<StitchAtlasPayload | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json() as StitchAtlasPayload;
  } catch (err) {
    console.warn("[StitchAtlas] Failed to load atlas JSON", url, err);
    return null;
  }
}

export async function loadFirstStitchFrameTexture(entry: AssetEntry, baseTexture: Texture): Promise<Texture | null> {
  const atlasUrl = atlasUrlFor(entry);
  if (!atlasUrl) return null;

  const payload = await loadAtlasPayload(atlasUrl);
  const firstFrame = Object.entries(payload?.frames ?? {})
    .filter(([, value]) => value.frame)
    .sort(([a], [b]) => a.localeCompare(b))[0]?.[1]?.frame;

  if (!firstFrame) return null;

  return new Texture({
    source: baseTexture.source,
    frame: new Rectangle(firstFrame.x, firstFrame.y, firstFrame.w, firstFrame.h),
  });
}
