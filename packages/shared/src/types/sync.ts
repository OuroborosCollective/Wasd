export type Vector3 = { x: number; y: number; z: number };
export type Quaternion = { x: number; y: number; z: number; w: number };

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  animationState: string;
  isSprinting: boolean;
  isCrouching: boolean;
  lastUpdated: number;
}

export interface TerrainUpdate {
  chunkId: string;
  indices: number[];
  heights: number[];
}

export interface TerrainMetadata {
  width: number;
  depth: number;
  subdivisions: number;
  minHeight: number;
  maxHeight: number;
}

export type EditorToolType = 'raise' | 'lower' | 'flatten' | 'smooth' | 'paint' | 'select' | 'place';

export interface EditorBrushSettings {
  radius: number;
  strength: number;
  falloff: number;
  textureIndex?: number;
}

export interface WorldEditorState {
  isActive: boolean;
  currentTool: EditorToolType;
  brush: EditorBrushSettings;
  selectedObjectId: string | null;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

export enum SyncActionType {
  PLAYER_JOIN = 'PLAYER_JOIN',
  PLAYER_LEAVE = 'PLAYER_LEAVE',
  PLAYER_MOVE = 'PLAYER_MOVE',
  TERRAIN_SYNC = 'TERRAIN_SYNC',
  EDITOR_TOOL_UPDATE = 'EDITOR_TOOL_UPDATE',
  EDITOR_ACTION = 'EDITOR_ACTION',
  OBJECT_TRANSFORM = 'OBJECT_TRANSFORM',
  OBJECT_SPAWN = 'OBJECT_SPAWN',
  OBJECT_DESTROY = 'OBJECT_DESTROY',
  WORLD_METADATA = 'WORLD_METADATA'
}

export interface SyncPacket<T = any> {
  type: SyncActionType;
  payload: T;
  senderId: string;
  timestamp: number;
}

export interface EntityTransformUpdate {
  entityId: string;
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface WorldState {
  players: Record<string, PlayerState>;
  terrain: {
    metadata: TerrainMetadata;
    chunks: Record<string, number[]>;
  };
  editor: WorldEditorState;
  entities: Record<string, EntityTransformUpdate>;
}