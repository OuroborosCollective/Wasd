/**
 * Asset Brain Architect - Database Schema
 * Stores generated 3D asset specifications with versioning and platform variants
 */

export interface AssetSpecification {
  id: string;
  userId: string;
  assetName: string;
  assetClass: 'character' | 'creature' | 'prop' | 'weapon' | 'environment';
  style: string;
  usage: string;
  description?: string;
  tags?: string[];
  
  // Complete specification sections
  platformProfiles: Record<string, PlatformProfile>;
  dimensions: DimensionSpec;
  topology: TopologySpec;
  uv: UVSpec;
  materials: MaterialSpec;
  rig: RigSpec;
  animations: AnimationSpec;
  lods: LODSpec;
  collision: CollisionSpec;
  attachments: AttachmentSpec;
  export: ExportSpec;
  fileContract: FileContract;
  qa: QASpec;
  
  // Auto-decisions made by the engine
  autoDecisions: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isPublic: boolean;
}

export interface PlatformProfile {
  platform: 'browser-mmo' | 'android' | 'pc-high-end';
  targetTriangles: number;
  maxBones: number;
  maxMaterials: number;
  textureResolution: string;
  lodStrategy: string;
}

export interface DimensionSpec {
  height: number;
  width: number;
  depth: number;
  boundingBoxMin: [number, number, number];
  boundingBoxMax: [number, number, number];
  recommendedScale: number;
}

export interface TopologySpec {
  triangleCount: number;
  vertexCount: number;
  edgeCount: number;
  polygonDensity: string;
  meshOptimization: string;
}

export interface UVSpec {
  uvChannels: number;
  texelDensity: number;
  seamHandling: string;
  atlasSize: string;
  padding: number;
}

export interface MaterialSpec {
  materialCount: number;
  pbr: boolean;
  textureTypes: string[];
  colorSpace: string;
  alphaBlending: boolean;
  normalMapping: boolean;
  roughnessMetallic: boolean;
}

export interface RigSpec {
  required: boolean;
  boneCount?: number;
  boneHierarchy?: string;
  skinWeights: boolean;
  deformationMethod?: string;
  bindPose?: string;
}

export interface AnimationSpec {
  animationCount: number;
  animationTypes: string[];
  frameRate: number;
  blendingSupport: boolean;
  rootMotion: boolean;
}

export interface LODSpec {
  lodCount: number;
  lod0Triangles: number;
  lod1Triangles?: number;
  lod2Triangles?: number;
  lodStrategy: string;
  transitionDistance: number;
}

export interface CollisionSpec {
  collisionType: string;
  collisionShapes: string[];
  physicsEnabled: boolean;
  convexHull: boolean;
  simplification: number;
}

export interface AttachmentSpec {
  attachmentPoints: string[];
  socketCount: number;
  socketNames: string[];
}

export interface ExportSpec {
  primaryFormat: 'glb' | 'gltf' | 'fbx' | 'usdz';
  secondaryFormats: string[];
  compressionLevel: number;
  embedTextures: boolean;
}

export interface FileContract {
  fileSize: string;
  deliverables: string[];
  sourceFiles: string[];
  textureInclusion: boolean;
  rigInclusion: boolean;
  animationInclusion: boolean;
}

export interface QASpec {
  checklist: QAChecklistItem[];
  validationRules: string[];
  performanceBudget: PerformanceBudget;
}

export interface QAChecklistItem {
  category: string;
  item: string;
  status: 'pending' | 'passed' | 'failed';
  notes?: string;
}

export interface PerformanceBudget {
  maxTriangles: number;
  maxBones: number;
  maxMaterials: number;
  maxTextureMemory: string;
  targetFrameRate: number;
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
