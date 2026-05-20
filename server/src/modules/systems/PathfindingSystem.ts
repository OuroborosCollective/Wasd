// @ARE-GUARD-EXEMPT: non-sim module
export interface IPathfindingSystem {
  isEntityMoving(entityId: string): boolean;
  getActiveDestination(entityId: string): { x: number; y: number; z: number; equals(p: { x: number; y: number; z?: number }): boolean } | null;
  setTarget(entityId: string, position: { x: number; y: number; z?: number }, _opts: unknown): void;
}

export class PathfindingSystem implements IPathfindingSystem {
  isEntityMoving(): boolean {
    return false;
  }

  getActiveDestination(): null {
    return null;
  }

  setTarget(): void {}
}
