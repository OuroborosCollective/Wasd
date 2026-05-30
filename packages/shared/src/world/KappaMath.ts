export type KappaInt = number & { readonly __brand: "KappaInt" };
export type TileInt = number & { readonly __brand: "TileInt" };

export const KAPPA_STANDARD = 1000 as const;
export const DEFAULT_CHUNK_TILES = 16 as const;

export function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer, got ${value}`);
  }
}

export function intDiv(numerator: number, denominator: number): number {
  assertInteger(numerator, "numerator");
  assertInteger(denominator, "denominator");
  if (denominator === 0) throw new Error("division by zero");
  const remainder = numerator % denominator;
  return (numerator - remainder) / denominator;
}

export function toTileInt(value: number): TileInt {
  assertInteger(value, "tile");
  return value as TileInt;
}

export function toKappa(units: number): KappaInt {
  assertInteger(units, "kappa units");
  return (units * KAPPA_STANDARD) as KappaInt;
}

export function fromKappaInt(value: KappaInt): number {
  assertInteger(value, "kappa value");
  return intDiv(value, KAPPA_STANDARD);
}

export function kappaAdd(a: KappaInt, b: KappaInt): KappaInt {
  return (a + b) as KappaInt;
}

export function kappaSub(a: KappaInt, b: KappaInt): KappaInt {
  return (a - b) as KappaInt;
}

export function kappaHalf(): KappaInt {
  return intDiv(KAPPA_STANDARD, 2) as KappaInt;
}

export function cellToKappa(tile: number, offsetPerMille = 500): KappaInt {
  assertInteger(tile, "tile");
  assertInteger(offsetPerMille, "offsetPerMille");
  if (offsetPerMille < 0 || offsetPerMille > KAPPA_STANDARD) throw new Error("offsetPerMille out of range");
  return (tile * KAPPA_STANDARD + offsetPerMille) as KappaInt;
}

export function cellKey(tileX: number, tileZ: number): string {
  assertInteger(tileX, "tileX");
  assertInteger(tileZ, "tileZ");
  return `${tileX}:${tileZ}`;
}

export function absInt(value: number): number {
  assertInteger(value, "value");
  return value < 0 ? -value : value;
}

export function clampInt(value: number, min: number, max: number): number {
  assertInteger(value, "value");
  assertInteger(min, "min");
  assertInteger(max, "max");
  if (min > max) throw new Error("min cannot exceed max");
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function manhattanCells(ax: number, az: number, bx: number, bz: number): number {
  return absInt(ax - bx) + absInt(az - bz);
}
