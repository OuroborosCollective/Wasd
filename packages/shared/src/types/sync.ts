export type Vector3 = { x: number; y: number; z: number };
export type Quaternion = { x: number; y: number; z: number; w: number };
export interface PlayerState {
  id: string; position: Vector3; rotation: Quaternion; velocity: Vector3;
  animationState: string; isSprinting: boolean; isCrouching: boolean; lastUpdated: number;
}
export interface Entity {
  id: string; entityId?: string; type: string; position: Vector3; rotation: Quaternion;
  scale?: Vector3; status: string; health: number; lastUpdateFrame?: number;
  cpuCost?: number; priority?: number; sequenceId?: string | number;
}
export interface EntityTransformUpdate extends Partial<Entity> {
  entityId: string; position: Vector3; rotation: Quaternion; scale: Vector3;
}
export interface WorldState {
  players: Record<string, PlayerState>;
  terrain: { metadata: any; chunks: Record<string, number[]>; };
  editor: any;
  entities: Record<string, EntityTransformUpdate>;
  frame?: number; performanceMetrics?: any; sequenceId?: string | number; lastProcessedAt?: number;
}
