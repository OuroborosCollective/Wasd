/**
 * Asset Brain Architect - Schema & Types
 * Re-exports engine types and adds DB-layer types
 */
export type {
  AssetClass,
  PlatformProfile,
  PlatformBudget,
  AssetSpecification,
} from './assetBrainEngine.js';

// ── DB-layer types ────────────────────────────────────────────────────────────

export interface AssetRecord {
  id: string;
  userId: string;
  assetName: string;
  assetClass: string;
  style: string;
  usage: string;
  description?: string;
  tags?: string[];
  specification: string; // JSON-serialized AssetSpecification
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isPublic: boolean;
}

export interface AssetVariant {
  id: string;
  specificationId: string;
  variantType: 'hero' | 'gameplay' | 'mobileweb';
  triangleCount: number;
  boneCount?: number;
  textureResolution: string;
  description: string;
  createdAt: Date;
}

export interface AssetLibraryEntry {
  id: string;
  specificationId: string;
  assetName: string;
  assetClass: string;
  style: string;
  tags: string[];
  thumbnail?: string;
  isPublic: boolean;
  downloads: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchJob {
  id: string;
  userId: string;
  jobType: 'csv-import' | 'json-import' | 'batch-generate';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputFile: string;
  outputFile?: string;
  assetsGenerated: number;
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}
