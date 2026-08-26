export class MissingResourceWorldSeedError extends Error {
  constructor(context: string) {
    super(`Missing worldSeed for ${context}`);
    this.name = "MissingResourceWorldSeedError";
  }
}

function cleanSeed(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveResourceWorldSeed(worldSeed: string | null | undefined, context = "resource generation"): string {
  const explicitSeed = cleanSeed(worldSeed);
  if (explicitSeed) return explicitSeed;

  const runtimeSeed = cleanSeed(process.env.WASD_WORLD_SEED)
    ?? cleanSeed(process.env.ARELORIA_WORLD_SEED)
    ?? cleanSeed(process.env.WORLD_SEED);

  if (runtimeSeed) return runtimeSeed;
  throw new MissingResourceWorldSeedError(context);
}
