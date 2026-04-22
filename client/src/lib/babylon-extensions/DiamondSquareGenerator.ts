/**
 * Diamond-Square Algorithm for procedural terrain heightmap generation.
 * 
 * Ported from Babylon.js Playground demo. Generates natural-looking terrain
 * with configurable roughness via the multiplier parameter.
 * 
 * The algorithm works by:
 * 1. Setting corner values randomly
 * 2. Repeatedly subdividing: diamond step (center average + random) then
 *    square step (edge midpoints average + random)
 * 3. Randomness decreases with each subdivision for natural falloff
 * 
 * @see https://en.wikipedia.org/wiki/Diamond-square_algorithm
 */

/**
 * Generate a heightmap using the diamond-square algorithm.
 * 
 * @param resolution - Grid size (must be 2^n + 1, e.g. 129, 257, 513, 1025)
 * @param multiplier - Roughness control. Lower = rougher terrain. Default 1.
 * @param seed - Optional seed for deterministic generation
 * @returns Float32Array of height values [0..1] for use as heightmap data
 */
export function diamondSquare(
  resolution: number,
  multiplier: number = 1,
  seed?: number
): Float32Array {
  // Validate resolution is 2^n + 1
  const n = Math.log2(resolution - 1);
  if (n !== Math.floor(n) || n < 1) {
    throw new Error(
      `[DiamondSquare] Resolution must be 2^n + 1 (got ${resolution}). ` +
      `Valid examples: 129, 257, 513, 1025`
    );
  }

  // Seeded random if seed provided
  const rand = seed !== undefined ? seededRandom(seed) : Math.random;

  const gridSize = resolution - 1;
  const rows: number[][] = [];

  // Initialize grid with zeros
  for (let y = 0; y < resolution; y++) {
    const columns: number[] = [];
    for (let x = 0; x < resolution; x++) {
      columns.push(0);
    }
    rows.push(columns);
  }

  // Set corner values
  rows[0][0] = rand() / multiplier;
  rows[0][gridSize] = rand() / multiplier;
  rows[gridSize][0] = rand() / multiplier;
  rows[gridSize][gridSize] = rand() / multiplier;

  let subdivisions = 1;
  let loopBreak = 0;

  while (loopBreak !== 1) {
    subdivisions = subdivisions * 2;
    const distance = gridSize / subdivisions;

    // Diamond step: compute center of each square
    for (let rowNumber = distance; rowNumber < resolution; rowNumber += distance * 2) {
      for (let columnNumber = distance; columnNumber < resolution; columnNumber += distance * 2) {
        rows[rowNumber][columnNumber] = diamondStep(
          rows, distance, rowNumber, columnNumber, subdivisions, multiplier, rand
        );
      }
    }

    // Square step: compute midpoint of each diamond edge
    for (let rowNumber = 0; rowNumber < resolution; rowNumber += distance) {
      for (let columnNumber = 0; columnNumber < resolution; columnNumber += distance) {
        if (rows[rowNumber][columnNumber] === 0) {
          rows[rowNumber][columnNumber] = squareStep(
            rows, distance, rowNumber, columnNumber, subdivisions, multiplier, rand
          );
        }
      }
    }

    // Check if all values filled
    loopBreak = 1;
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        if (rows[y][x] === 0) {
          loopBreak = 0;
        }
      }
    }
  }

  // Convert to Float32Array (height values 0..1)
  const data = new Float32Array(resolution * resolution);
  let idx = 0;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      // Normalize to 0..1 range
      const val = rows[y][x];
      data[idx] = Math.min(1, Math.max(0, val));
      idx++;
    }
  }

  return data;
}

/**
 * Generate heightmap data in DynamicTerrain format (Float32Array of x,y,z triplets).
 * 
 * @param subX - Number of subdivisions along X
 * @param subZ - Number of subdivisions along Z  
 * @param width - World width of terrain
 * @param depth - World depth of terrain
 * @param amplitude - Height amplitude in world units
 * @param multiplier - Diamond-square roughness (lower = rougher)
 * @param seed - Optional seed for deterministic generation
 * @returns Float32Array of [x,y,z, x,y,z, ...] positions
 */
export function generateDiamondSquareHeightmap(
  subX: number,
  subZ: number,
  width: number,
  depth: number,
  amplitude: number = 8,
  multiplier: number = 1,
  seed?: number
): Float32Array {
  // Diamond-square needs 2^n + 1 resolution — find nearest valid resolution
  const maxSub = Math.max(subX, subZ);
  const n = Math.ceil(Math.log2(maxSub));
  const dsResolution = Math.pow(2, n) + 1;

  // Generate raw heightmap
  const rawMap = diamondSquare(dsResolution, multiplier, seed);

  // Convert to DynamicTerrain format (x,y,z triplets) with bilinear interpolation
  const data = new Float32Array(subX * subZ * 3);
  const halfW = width / 2;
  const halfD = depth / 2;

  for (let j = 0; j < subZ; j++) {
    for (let i = 0; i < subX; i++) {
      const idx = (j * subX + i) * 3;
      const x = -halfW + (i / (subX - 1)) * width;
      const z = -halfD + (j / (subZ - 1)) * depth;

      // Bilinear interpolate from diamond-square grid
      const u = (i / (subX - 1)) * (dsResolution - 1);
      const v = (j / (subZ - 1)) * (dsResolution - 1);
      const heightValue = bilinearSample(rawMap, dsResolution, u, v);

      data[idx] = x;
      data[idx + 1] = heightValue * amplitude;
      data[idx + 2] = z;
    }
  }

  return data;
}

/**
 * Generate an RGB noise texture from diamond-square data.
 * Returns Uint8Array suitable for BABYLON.RawTexture.CreateRGBTexture.
 * 
 * @param resolution - Grid resolution (2^n + 1)
 * @param multiplier - Roughness control
 * @param seed - Optional seed
 * @returns Uint8Array of RGB pixel data
 */
export function generateDiamondSquareTexture(
  resolution: number,
  multiplier: number = 1,
  seed?: number
): Uint8Array {
  const rawMap = diamondSquare(resolution, multiplier, seed);
  const dataArray = new Uint8Array(resolution * resolution * 3);

  for (let i = 0; i < rawMap.length; i++) {
    const val = Math.min(255, Math.max(0, rawMap[i] * 255));
    const idx = i * 3;
    dataArray[idx] = val;
    dataArray[idx + 1] = val;
    dataArray[idx + 2] = val;
  }

  return dataArray;
}

/**
 * Generate a chunk-local heightmap using diamond-square.
 * Uses chunk coordinates for deterministic seeding.
 * 
 * @param chunkX - Chunk X coordinate
 * @param chunkZ - Chunk Z coordinate
 * @param chunkSize - Size of chunk in world units
 * @param subdivisions - Heightmap resolution per chunk (2^n + 1)
 * @param amplitude - Max height
 * @param worldSeed - Global world seed for determinism
 * @returns Object with heightmap data and metadata
 */
export function generateChunkHeightmap(
  chunkX: number,
  chunkZ: number,
  chunkSize: number,
  subdivisions: number = 65,
  amplitude: number = 8,
  worldSeed: number = 42
): { data: Float32Array; resolution: number; amplitude: number } {
  // Deterministic seed from chunk coords + world seed
  const chunkSeed = hashChunkCoord(chunkX, chunkZ, worldSeed);
  
  // Higher multiplier for smoother per-chunk terrain
  const multiplier = 1.5;
  
  const data = new Float32Array(subdivisions * subdivisions * 3);
  const rawMap = diamondSquare(subdivisions, multiplier, chunkSeed);
  
  const halfSize = chunkSize / 2;
  const originX = chunkX * chunkSize;
  const originZ = chunkZ * chunkSize;

  for (let j = 0; j < subdivisions; j++) {
    for (let i = 0; i < subdivisions; i++) {
      const idx = (j * subdivisions + i) * 3;
      const localX = (i / (subdivisions - 1)) * chunkSize;
      const localZ = (j / (subdivisions - 1)) * chunkSize;
      const heightValue = rawMap[j * subdivisions + i];

      data[idx] = originX + localX;
      data[idx + 1] = heightValue * amplitude;
      data[idx + 2] = originZ + localZ;
    }
  }

  return { data, resolution: subdivisions, amplitude };
}

// ── Internal Helpers ──────────────────────────────────────────────────

function diamondStep(
  rows: number[][],
  distance: number,
  rowNumber: number,
  columnNumber: number,
  subdivisions: number,
  multiplier: number,
  rand: () => number
): number {
  const avg: number[] = [];

  if (rows[rowNumber - distance]?.[columnNumber - distance] != null) {
    avg.push(rows[rowNumber - distance][columnNumber - distance]);
  }
  if (rows[rowNumber - distance]?.[columnNumber + distance] != null) {
    avg.push(rows[rowNumber - distance][columnNumber + distance]);
  }
  if (rows[rowNumber + distance]?.[columnNumber - distance] != null) {
    avg.push(rows[rowNumber + distance][columnNumber - distance]);
  }
  if (rows[rowNumber + distance]?.[columnNumber + distance] != null) {
    avg.push(rows[rowNumber + distance][columnNumber + distance]);
  }

  let value = 0;
  for (const v of avg) value += v;
  value = value / avg.length + (rand() - 0.5) / multiplier / subdivisions;

  return value;
}

function squareStep(
  rows: number[][],
  distance: number,
  rowNumber: number,
  columnNumber: number,
  subdivisions: number,
  multiplier: number,
  rand: () => number
): number {
  const avg: number[] = [];

  if (rows[rowNumber - distance] != null && rows[rowNumber - distance][columnNumber] != null) {
    avg.push(rows[rowNumber - distance][columnNumber]);
  }
  if (rows[rowNumber]?.[columnNumber + distance] != null) {
    avg.push(rows[rowNumber][columnNumber + distance]);
  }
  if (rows[rowNumber + distance] != null && rows[rowNumber + distance][columnNumber] != null) {
    avg.push(rows[rowNumber + distance][columnNumber]);
  }
  if (rows[rowNumber]?.[columnNumber - distance] != null) {
    avg.push(rows[rowNumber][columnNumber - distance]);
  }

  let value = 0;
  for (const v of avg) value += v;
  value = value / avg.length + (rand() - 0.5) / multiplier / subdivisions;

  return value;
}

/**
 * Bilinear interpolation sample from a flat heightmap.
 */
function bilinearSample(
  data: Float32Array,
  resolution: number,
  u: number,
  v: number
): number {
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const fx = u - x0;
  const fy = v - y0;

  const h00 = data[y0 * resolution + x0];
  const h10 = data[y0 * resolution + x1];
  const h01 = data[y1 * resolution + x0];
  const h11 = data[y1 * resolution + x1];

  return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
}

/**
 * Deterministic seed from chunk coordinates.
 */
function hashChunkCoord(cx: number, cz: number, worldSeed: number): number {
  let h = worldSeed;
  h = ((h << 5) - h + cx) | 0;
  h = ((h << 5) - h + cz) | 0;
  h = ((h << 5) - h + 0x9e3779b9) | 0;
  h = h ^ (h >>> 16);
  return Math.abs(h) || 1;
}

/**
 * Mulberry32 seeded PRNG for deterministic generation.
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
