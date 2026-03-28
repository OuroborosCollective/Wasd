export interface EntityViewModel {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  modelUrl?: string;
  visible: boolean;
  name?: string;
  health?: number;
  maxHealth?: number;
}
