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
  const worldSnapshot: InteractWorldSnapshot = {
    ...({} as SharedInteractWorldSnapshot),
    npcs: snapshot,
  };
  const result = sharedGetClosestNpc(worldSnapshot, point);
  return (result as ClosestInteractable) || null;
};

export const getClosestInteractable = (
  snapshot: InteractWorldSnapshot,
  point: InteractPoint
): ClosestInteractable | null => {
  const result = sharedGetClosestInteractable(snapshot, point);
  return (result as ClosestInteractable) || null;
};