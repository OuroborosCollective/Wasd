import { Texture, type StandardMaterial } from "@babylonjs/core";

/** Texture repeats across the main 128×128 ground (higher = smaller texels, sharper when viewed from above). */
export const MAIN_GROUND_UV_SCALE = 32;
/** Chunk tiles are 16m; keep similar texel density as main ground */
export function chunkGroundUvScale(): number {
  return MAIN_GROUND_UV_SCALE * (16 / 128);
}

export function applyTiledGroundTextures(
  mat: StandardMaterial,
  uScale: number,
  vScale?: number,
): void {
  const v = vScale ?? uScale;
  if (mat.diffuseTexture) {
    const diffuse = mat.diffuseTexture as Texture;
    diffuse.uScale = uScale;
    diffuse.vScale = v;
    mat.diffuseTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    mat.diffuseTexture.wrapV = Texture.WRAP_ADDRESSMODE;
  }
  if (mat.bumpTexture) {
    const bump = mat.bumpTexture as Texture;
    bump.uScale = uScale;
    bump.vScale = v;
    mat.bumpTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    mat.bumpTexture.wrapV = Texture.WRAP_ADDRESSMODE;
  }
}
