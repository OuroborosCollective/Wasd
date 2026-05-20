// @ARE-GUARD-EXEMPT: non-sim module
/**
 * Server-side terrain generation using diamond-square algorithm.
 * Provides consistent terrain heights between client and server
 * for physics, AI pathfinding, and placement validation.
 */

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashChunkCoord(cx: number, cz: number, worldSeed: number): number {
  let h = worldSeed;
  h = ((h << 5) - h + cx) | 0;
  h = ((h << 5) - h + cz) | 0;
  h = ((h << 5) - h + 0x9e3779b9) | 0;
  h = h ^ (h >>> 16);
  return Math.abs(h) || 1;
}

function diamondStep(rows: number[][], distance: number, rowNumber: number, columnNumber: number, subdivisions: number, multiplier: number, rand: () => number): number {
  const avg: number[] = [];
  if (rows[rowNumber - distance]?.[columnNumber - distance] != null) avg.push(rows[rowNumber - distance][columnNumber - distance]);
  if (rows[rowNumber - distance]?.[columnNumber + distance] != null) avg.push(rows[rowNumber - distance][columnNumber + distance]);
  if (rows[rowNumber + distance]?.[columnNumber - distance] != null) avg.push(rows[rowNumber + distance][columnNumber - distance]);
  if (rows[rowNumber + distance]?.[columnNumber + distance] != null) avg.push(rows[rowNumber + distance][columnNumber + distance]);
  let value = 0;
  for (const v of avg) value += v;
  value = value / avg.length + (rand() - 0.5) / multiplier / subdivisions;
  return value;
}

function squareStep(rows: number[][], distance: number, rowNumber: number, columnNumber: number, subdivisions: number, multiplier: number, rand: () => number): number {
  const avg: number[] = [];
  if (rows[rowNumber - distance] != null && rows[rowNumber - distance][columnNumber] != null) avg.push(rows[rowNumber - distance][columnNumber]);
  if (rows[rowNumber]?.[columnNumber + distance] != null) avg.push(rows[rowNumber][columnNumber + distance]);
  if (rows[rowNumber + distance] != null && rows[rowNumber + distance][columnNumber] != null) avg.push(rows[rowNumber + distance][columnNumber]);
  if (rows[rowNumber]?.[columnNumber - distance] != null) avg.push(rows[rowNumber][columnNumber - distance]);
  let value = 0;
  for (const v of avg) value += v;
  value = value / avg.length + (rand() - 0.5) / multiplier / subdivisions;
  return value;
}

function diamondSquare(resolution: number, multiplier: number, rand: () => number): Float32Array {
  const gridSize = resolution - 1;
  const rows: number[][] = [];
  for (let y = 0; y < resolution; y++) { const c: number[] = []; for (let x = 0; x < resolution; x++) c.push(0); rows.push(c); }
  rows[0][0] = rand() / multiplier;
  rows[0][gridSize] = rand() / multiplier;
  rows[gridSize][0] = rand() / multiplier;
  rows[gridSize][gridSize] = rand() / multiplier;
  let subdivisions = 1, loopBreak = 0;
  while (loopBreak !== 1) {
    subdivisions *= 2;
    const distance = gridSize / subdivisions;
    for (let r = distance; r < resolution; r += distance * 2)
      for (let c = distance; c < resolution; c += distance * 2)
        rows[r][c] = diamondStep(rows, distance, r, c, subdivisions, multiplier, rand);
    for (let r = 0; r < resolution; r += distance)
      for (let c = 0; c < resolution; c += distance)
        if (rows[r][c] === 0) rows[r][c] = squareStep(rows, distance, r, c, subdivisions, multiplier, rand);
    loopBreak = 1;
    for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) if (rows[y][x] === 0) loopBreak = 0;
  }
  const data = new Float32Array(resolution * resolution);
  let idx = 0;
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) { data[idx] = Math.min(1, Math.max(0, rows[y][x])); idx++; }
  return data;
}

function bilinearSample(data: Float32Array, resolution: number, u: number, v: number): number {
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const x1 = Math.min(x0 + 1, resolution - 1), y1 = Math.min(y0 + 1, resolution - 1);
  const fx = u - x0, fy = v - y0;
  return data[y0 * resolution + x0] * (1 - fx) * (1 - fy) + data[y0 * resolution + x1] * fx * (1 - fy) + data[y1 * resolution + x0] * (1 - fx) * fy + data[y1 * resolution + x1] * fx * fy;
}

export interface TerrainGeneratorConfig {
  worldSeed: number;
  amplitude: number;
  roughness: number;
  chunkSize: number;
  chunkResolution: number;
  mapWidth: number;
  mapDepth: number;
}

const DEFAULT_CONFIG: TerrainGeneratorConfig = {
  worldSeed: 42, amplitude: 8, roughness: 1.2,
  chunkSize: 64, chunkResolution: 65, mapWidth: 400, mapDepth: 400,
};

export class TerrainGenerator {
  private config: TerrainGeneratorConfig;
  private chunkCache = new Map<string, Float32Array>();

  constructor(config?: Partial<TerrainGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getHeight(x: number, z: number): number {
    const { chunkSize, chunkResolution, amplitude, worldSeed, roughness } = this.config;
    const cx = Math.floor(x / chunkSize), cz = Math.floor(z / chunkSize);
    const key = `${cx},${cz}`;
    let chunkData = this.chunkCache.get(key);
    if (!chunkData) {
      const chunkSeed = hashChunkCoord(cx, cz, worldSeed);
      chunkData = diamondSquare(chunkResolution, roughness, seededRandom(chunkSeed));
      this.chunkCache.set(key, chunkData);
    }
    const localX = x - cx * chunkSize, localZ = z - cz * chunkSize;
    const u = (localX / chunkSize) * (chunkResolution - 1), v = (localZ / chunkSize) * (chunkResolution - 1);
    return bilinearSample(chunkData, chunkResolution, u, v) * amplitude;
  }

  getHeightLegacy(x: number, y: number): number { return this.getHeight(x, y); }

  getSlope(x: number, z: number): number {
    const d = 1;
    const h0 = this.getHeight(x, z), hx = this.getHeight(x + d, z), hz = this.getHeight(x, z + d);
    return Math.sqrt(((hx - h0) / d) ** 2 + ((hz - h0) / d) ** 2);
  }

  getNormal(x: number, z: number): { x: number; y: number; z: number } {
    const d = 1;
    const h0 = this.getHeight(x, z), hx = this.getHeight(x + d, z), hz = this.getHeight(x, z + d);
    const dx = (hx - h0) / d, dz = (hz - h0) / d;
    const len = Math.sqrt(dx * dx + 1 + dz * dz);
    return { x: -dx / len, y: 1 / len, z: -dz / len };
  }

  generateChunkData(chunkX: number, chunkZ: number): { heights: Float32Array; resolution: number; amplitude: number } {
    const { chunkSize, chunkResolution, amplitude, worldSeed, roughness } = this.config;
    const key = `${chunkX},${chunkZ}`;
    let chunkData = this.chunkCache.get(key);
    if (!chunkData) {
      chunkData = diamondSquare(chunkResolution, roughness, seededRandom(hashChunkCoord(chunkX, chunkZ, worldSeed)));
      this.chunkCache.set(key, chunkData);
    }
    return { heights: chunkData, resolution: chunkResolution, amplitude };
  }

  clearCache(): void { this.chunkCache.clear(); }

  updateConfig(config: Partial<TerrainGeneratorConfig>): void {
    const needsClear = config.worldSeed !== undefined || config.roughness !== undefined || config.chunkResolution !== undefined;
    this.config = { ...this.config, ...config };
    if (needsClear) this.clearCache();
  }

  // HeightmapDataSource interface for ServerTerrainAdapter
  getMapData(): Float32Array {
    const { mapWidth, mapDepth } = this.config;
    const subX = Math.min(100, Math.ceil(mapWidth / 4)), subZ = Math.min(100, Math.ceil(mapDepth / 4));
    const data = new Float32Array(subX * subZ * 3);
    const halfW = mapWidth / 2, halfD = mapDepth / 2;
    for (let j = 0; j < subZ; j++) for (let i = 0; i < subX; i++) {
      const idx = (j * subX + i) * 3;
      const x = -halfW + (i / (subX - 1)) * mapWidth, z = -halfD + (j / (subZ - 1)) * mapDepth;
      data[idx] = x; data[idx + 1] = this.getHeight(x, z); data[idx + 2] = z;
    }
    return data;
  }

  getMapSubX(): number { return Math.min(100, Math.ceil(this.config.mapWidth / 4)); }
  getMapSubZ(): number { return Math.min(100, Math.ceil(this.config.mapDepth / 4)); }
  getMapWidth(): number { return this.config.mapWidth; }
  getMapHeight(): number { return this.config.mapDepth; }
}

export const terrainGenerator = new TerrainGenerator();
