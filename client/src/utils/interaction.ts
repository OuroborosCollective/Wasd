import {
  INTERACT_DISTANCE,
  getClosestNpc as sharedGetClosestNpc,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot as SharedInteractWorldSnapshot,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
  type InteractPoint as SharedInteractPoint,
} from "@shared/interaction";

export interface InteractPoint extends SharedInteractPoint {
  npcs?: InteractNpcSnapshot[];
  position: { x: number; y: number };
}

export interface InteractWorldSnapshot extends SharedInteractWorldSnapshot {
  npcs: InteractNpcSnapshot[];
}

export {
  INTERACT_DISTANCE,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
};

export const getClosestNpc = (
  snapshot: InteractNpcSnapshot[],
  point: InteractPoint
): ClosestInteractable | null => {
  const worldSnapshot: SharedInteractWorldSnapshot = {
    npcs: snapshot,
    loot: [],
  };
  
  const result = sharedGetClosestNpc(
    worldSnapshot, 
    { position: point.position } as unknown as SharedInteractPoint
  );
  return (result as ClosestInteractable) || null;
};

export const getClosestInteractable = (
  snapshot: InteractWorldSnapshot,
  point: InteractPoint
): ClosestInteractable | null => {
  const result = sharedGetClosestInteractable(
    snapshot as SharedInteractWorldSnapshot, 
    { position: point.position } as unknown as SharedInteractPoint
  );
  return (result as ClosestInteractable) || null;
};