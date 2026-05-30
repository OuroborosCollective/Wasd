export type IsoPoint = {
  x: number;
  y: number;
  zIndex: number;
};

/** Default tile dimensions for Areloria isometric grid */
export const TILE_W = 96;
export const TILE_H = 48;

export type IsoProjectionInput = {
  gridX: number;
  gridZ: number;
  height?: number;
  screenWidth: number;
  screenHeight: number;
  tileWidth: number;
  tileHeight: number;
};

export function iso2(input: Omit<IsoProjectionInput, 'height'>): IsoPoint {
  const x = input.screenWidth / 2 + (input.gridX - input.gridZ) * input.tileWidth * 0.5;
  const y = input.screenHeight * 0.45 + (input.gridX + input.gridZ) * input.tileHeight * 0.5;
  return { x, y, zIndex: y };
}

export function iso3(input: IsoProjectionInput): IsoPoint {
  const height = Number.isFinite(input.height) ? Number(input.height) : 0;
  const base = iso2(input);
  return {
    x: base.x,
    y: base.y - height * input.tileHeight * 0.45,
    zIndex: base.y + height * 0.1,
  };
}
