/**
 * Babylon.js Playground texture library (same files as in the Babylon repo:
 * packages/tools/playground/public/textures). Licensed under Apache-2.0 with Babylon.js.
 *
 * Served via jsDelivr from GitHub so the game can load them without hosting copies.
 * Override with VITE_BABYLON_PLAYGROUND_TEXTURES_BASE (must end with /textures/ or full folder URL).
 *
 * @see https://github.com/BabylonJS/Babylon.js/tree/master/packages/tools/playground/public/textures
 * @see https://doc.babylonjs.com/toolsAndResources/assetLibraries/availableTextures
 */
const DEFAULT_BASE =
  "https://cdn.jsdelivr.net/gh/BabylonJS/Babylon.js@master/packages/tools/playground/public/textures/";

function normalizeBase(raw: string): string {
  const t = raw.trim();
  if (!t) return DEFAULT_BASE;
  return t.endsWith("/") ? t : `${t}/`;
}

export function getPlaygroundTexturesBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BABYLON_PLAYGROUND_TEXTURES_BASE;
  return normalizeBase(env ?? DEFAULT_BASE);
}

/** Path relative to the textures folder, e.g. "grass.jpg" or "lava/lavatile.jpg" */
export function playgroundTextureUrl(relativePath: string): string {
  const path = relativePath.replace(/^\/+/, "");
  return `${getPlaygroundTexturesBaseUrl()}${path}`;
}

/** Defaults for world ground until you ship your own assets */
export const DEFAULT_GROUND_DIFFUSE = "grass.jpg";
export const DEFAULT_GROUND_BUMP = "grassn.png";
