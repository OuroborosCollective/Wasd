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
  const interactPoint: InteractPoint = { x: point.x, y: point.y };
  const result = sharedGetClosestNpc(snapshot, interactPoint);
  return result || null;
};

export const getClosestInteractable = (
  snapshot: InteractWorldSnapshot,
  point: InteractPoint
): ClosestInteractable | null => {
  const interactPoint: InteractPoint = { x: point.x, y: point.y };
  const result = sharedGetClosestInteractable(snapshot, interactPoint);
  return result || null;
};