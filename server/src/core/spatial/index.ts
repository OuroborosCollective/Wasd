/**
 * CORE SPATIAL MODULE
 * 
 * Unified chunk geometry and interest management.
 * 
 * This module provides:
 * - ChunkMath: Tile/Kappa/Chunk coordinate conversions
 * - UnifiedChunkContract: Single source of truth for chunk geometry
 * - InterestGrid: Observer-to-chunk interest mapping
 * - ObservedChunkSet: Chunk visibility delta tracking
 * - MortonCode: Z-order curve encoding for spatial indexing
 */

// Chunk math utilities
export {
  CHUNK_SIZE_TILES,
  CHUNK_SIZE_KAPPA,
  CHUNK_SIZE,
  kappaToTile,
  tileToKappa,
  tileToChunkCoord,
  kappaToChunkCoord,
  getChunkKey,
  parseChunkKey,
  getChunkKeysInRadius,
  computeChunkKey,
  computeChunkCoords,
  getChunkCenterTile,
  getChunkGrid,
  get3x3ChunkKeys,
  get5x5ChunkKeys,
  isSameChunk,
  areInSameChunk,
  chunkManhattanDistance,
  chunkEuclideanDistance,
  isValidChunkKey,
  getChunkBoundingBox,
} from './ChunkMath';

// Unified Chunk Contract
export {
  UNIFIED_CHUNK_CONTRACT,
  assertValidChunkCoord,
  type UnifiedChunkContract,
} from './UnifiedChunkContract';

// Morton Code (Z-order curve)
export {
  encodeMorton,
  decodeMorton,
  MortonCode,
  chunkKeyToMorton,
  mortonToChunkKey,
  mortonDistance,
  mortonMidpoint,
  isMortonInRange,
  getMortonBounds,
  MortonCodeRange,
} from './MortonCode';

// Interest Grid
export {
  InterestGrid,
  createInterestGrid,
  type ObserverInterest,
} from './InterestGrid';

// Observed Chunk Set
export {
  ObservedChunkSet,
  ChunkSetFactory,
  diffChunks,
  type ChunkDelta,
} from './ObservedChunkSet';