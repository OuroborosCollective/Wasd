import {
  INTERACT_DISTANCE,
  getClosestNpc as sharedGetClosestNpc,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
  type InteractPoint,
} from "@shared/interaction";

export {
  INTERACT_DISTANCE,
  type InteractWorldSnapshot,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
  type InteractPoint,
};

export const getClosestNpc = (
  snapshot: InteractNpcSnapshot[],
  point: InteractPoint
): ClosestInteractable | null => {
  const result = sharedGetClosestNpc(snapshot, point);
  return result || null;
};

export const getClosestInteractable = (
  snapshot: InteractWorldSnapshot,
  point: InteractPoint
): ClosestInteractable | null => {
  const result = sharedGetClosestInteractable(snapshot, point);
  return result || null;
};