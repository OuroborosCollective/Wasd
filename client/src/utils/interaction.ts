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
  snapshot: InteractNpcSnapshot,
  point: InteractPoint
): ClosestInteractable => {
  return sharedGetClosestNpc(snapshot, point);
};

export const getClosestInteractable = (
  snapshot: InteractWorldSnapshot,
  point: InteractPoint
): ClosestInteractable => {
  return sharedGetClosestInteractable(snapshot, point);
};