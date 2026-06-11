/**
 * ARELORIA Stateless World Runtime Resolver
 *
 * Converts explicit deterministic inputs into runtime world state.
 *
 * Axioms are allowed constants. Runtime state is not allowed to live as
 * hardcoded literals inside React components or render boot paths.
 */

export const STATELESS_WORLD_AXIOMS = Object.freeze({
  KAPPA_INVARIANT: 1000,
  CHUNK_SIZE_TILES: 16,
  VIEW_RADIUS_CHUNKS: 1,
});

export interface WorldPositionInput {
  readonly x: number;
  readonly z: number;
}

export interface StoredSpawnInput {
  readonly x: number;
  readonly z: number;
}

export interface StatelessWorldRuntimeInputs {
  readonly identity: string | null | undefined;
  readonly worldSeed: string | null | undefined;
  readonly kappaInvariant?: number | null;
  readonly chunkSizeTiles?: number | null;
  readonly viewRadiusChunks?: number | null;
  readonly currentPosition?: WorldPositionInput | null;
  readonly storedSpawn?: StoredSpawnInput | null;
}

export interface InitialChunkPlanInput {
  readonly worldSeed: string;
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly biomeId: string;
  readonly kappa: number;
  readonly chunkTiles: number;
}

export interface StatelessWorldRuntimeState {
  readonly playerId: string;
  readonly worldSeed: string;
  readonly kappaInvariant: number;
  readonly chunkSizeTiles: number;
  readonly viewRadiusChunks: number;
  readonly position: WorldPositionInput;
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly chunkKey: string;
  readonly biomeId: string;
  readonly visibleChunkKeys: readonly string[];
  readonly spawnCell: WorldPositionInput;
  readonly initialChunkPlanInput: InitialChunkPlanInput;
}

const BIOME_LADDER = [
  { ceiling: 7, id: "cyber_zen_glass" },
  { ceiling: 28, id: "deep_forest" },
  { ceiling: 58, id: "plains" },
  { ceiling: 82, id: "temperate_swamp" },
  { ceiling: 100, id: "forest_village" },
] as const;

function sanitizeNonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function positiveInteger(value: number | null | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || Number(value) <= 0) return fallback;
  return Number(value);
}

function finitePosition(value: WorldPositionInput | StoredSpawnInput | null | undefined): WorldPositionInput | null {
  if (!value) return null;
  const x = Number(value.x);
  const z = Number(value.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x: Math.trunc(x), z: Math.trunc(z) };
}

/** FNV-1a 32-bit hash. Deterministic across JS runtimes for ASCII/UTF-16 inputs. */
export function stableWorldHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function signedRange(hash: number, radius: number): number {
  const span = radius * 2 + 1;
  return (hash % span) - radius;
}

export function resolveWorldSeed(input: string | null | undefined): string {
  return sanitizeNonEmpty(input) ?? "areloria:default-world";
}

export function resolvePlayerId(input: string | null | undefined, worldSeed: string): string {
  const explicit = sanitizeNonEmpty(input);
  if (explicit) return explicit;
  const digest = stableWorldHash32(`anonymous:${worldSeed}`).toString(16).padStart(8, "0");
  return `anon_${digest}`;
}

export function resolveSpawnCell(input: {
  readonly playerId: string;
  readonly worldSeed: string;
  readonly chunkSizeTiles: number;
  readonly storedSpawn?: StoredSpawnInput | null;
  readonly currentPosition?: WorldPositionInput | null;
}): WorldPositionInput {
  const current = finitePosition(input.currentPosition);
  if (current) return current;

  const stored = finitePosition(input.storedSpawn);
  if (stored) return stored;

  const seed = `${input.worldSeed}:${input.playerId}:spawn:v1`;
  const hx = stableWorldHash32(`${seed}:x`);
  const hz = stableWorldHash32(`${seed}:z`);

  const spawnChunkRadius = 64;
  const chunkX = signedRange(hx, spawnChunkRadius);
  const chunkZ = signedRange(hz, spawnChunkRadius);
  const centerOffset = Math.floor(input.chunkSizeTiles / 2);

  return {
    x: chunkX * input.chunkSizeTiles + centerOffset,
    z: chunkZ * input.chunkSizeTiles + centerOffset,
  };
}

export function positionToChunk(input: {
  readonly position: WorldPositionInput;
  readonly chunkSizeTiles: number;
}): { chunkX: number; chunkZ: number; chunkKey: string } {
  const chunkX = Math.floor(input.position.x / input.chunkSizeTiles);
  const chunkZ = Math.floor(input.position.z / input.chunkSizeTiles);
  return {
    chunkX,
    chunkZ,
    chunkKey: `${chunkX}_${chunkZ}`,
  };
}

export function resolveBiomeId(input: {
  readonly worldSeed: string;
  readonly chunkX: number;
  readonly chunkZ: number;
}): string {
  const score = stableWorldHash32(`${input.worldSeed}:biome:${input.chunkX}:${input.chunkZ}`) % 100;
  return BIOME_LADDER.find((entry) => score < entry.ceiling)?.id ?? "forest_village";
}

export function resolveVisibleChunkKeys(input: {
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly viewRadiusChunks: number;
}): readonly string[] {
  const keys: string[] = [];
  for (let z = -input.viewRadiusChunks; z <= input.viewRadiusChunks; z += 1) {
    for (let x = -input.viewRadiusChunks; x <= input.viewRadiusChunks; x += 1) {
      keys.push(`${input.chunkX + x}_${input.chunkZ + z}`);
    }
  }
  return keys;
}

export function resolveStatelessWorldRuntime(
  inputs: StatelessWorldRuntimeInputs,
): StatelessWorldRuntimeState {
  const kappaInvariant = positiveInteger(inputs.kappaInvariant, STATELESS_WORLD_AXIOMS.KAPPA_INVARIANT);
  const chunkSizeTiles = positiveInteger(inputs.chunkSizeTiles, STATELESS_WORLD_AXIOMS.CHUNK_SIZE_TILES);
  const viewRadiusChunks = positiveInteger(inputs.viewRadiusChunks, STATELESS_WORLD_AXIOMS.VIEW_RADIUS_CHUNKS);
  const worldSeed = resolveWorldSeed(inputs.worldSeed);
  const playerId = resolvePlayerId(inputs.identity, worldSeed);
  const spawnCell = resolveSpawnCell({
    playerId,
    worldSeed,
    chunkSizeTiles,
    storedSpawn: inputs.storedSpawn,
    currentPosition: inputs.currentPosition,
  });
  const position = finitePosition(inputs.currentPosition) ?? spawnCell;
  const { chunkX, chunkZ, chunkKey } = positionToChunk({ position, chunkSizeTiles });
  const biomeId = resolveBiomeId({ worldSeed, chunkX, chunkZ });
  const visibleChunkKeys = resolveVisibleChunkKeys({ chunkX, chunkZ, viewRadiusChunks });

  return Object.freeze({
    playerId,
    worldSeed,
    kappaInvariant,
    chunkSizeTiles,
    viewRadiusChunks,
    position,
    chunkX,
    chunkZ,
    chunkKey,
    biomeId,
    visibleChunkKeys,
    spawnCell,
    initialChunkPlanInput: Object.freeze({
      worldSeed,
      chunkX,
      chunkZ,
      biomeId,
      kappa: kappaInvariant,
      chunkTiles: chunkSizeTiles,
    }),
  });
}

export function readStatelessWorldSeedFromRuntime(): string {
  const urlSeed = new URLSearchParams(window.location.search).get("worldSeed");
  const envSeed = import.meta.env.VITE_ARELORIA_WORLD_SEED as string | undefined;
  const storedSeed = localStorage.getItem("wasd:2d:worldSeed");
  return resolveWorldSeed(urlSeed ?? envSeed ?? storedSeed);
}

export function readStatelessIdentityFromRuntime(): string | null {
  return (
    sanitizeNonEmpty(localStorage.getItem("wasd:2d:playerId")) ??
    sanitizeNonEmpty(localStorage.getItem("wasd:2d:publicKey")) ??
    sanitizeNonEmpty(localStorage.getItem("wasd:2d:identityHash"))
  );
}

export function readStoredSpawnFromRuntime(): StoredSpawnInput | null {
  try {
    const raw = localStorage.getItem("wasd:2d:spawn");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSpawnInput>;
    return finitePosition({ x: Number(parsed.x), z: Number(parsed.z) });
  } catch {
    return null;
  }
}
