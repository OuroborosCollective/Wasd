import {
  INTERACT_DISTANCE,
  getClosestNpc as sharedGetClosestNpc,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot as SharedInteractWorldSnapshot,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
  type InteractPoint as SharedInteractPoint,
} from "@shared/utils/interaction";

/**
 * Interface for interaction messages sent between client components or to the server.
 */
export interface InteractionMsg {
  type: 'npc' | 'loot' | 'object' | 'dialogue' | 'quest';
  id: string;
  action?: string;
  payload?: Record<string, any>;
  position?: [number, number, number];
}

/**
 * Determines the closest interactable object (NPC, Loot, or Point) based on player position.
 * Re-exports and wraps the shared logic for client-side use.
 */
export const getClosestInteractable = (
  playerPos: [number, number, number],
  snapshot: SharedInteractWorldSnapshot
): ClosestInteractable | null => {
  return sharedGetClosestInteractable({ position: { x: playerPos[0], y: playerPos[2] } }, snapshot);
};

/**
 * Handles the interaction logic based on the provided interaction message.
 */
export const handleInteraction = (msg: InteractionMsg): void => {
  console.log(`[InteractionHandler] Processing interaction: ${msg.type} (ID: ${msg.id})`, msg);
  
  switch (msg.type) {
    case 'npc':
      // Trigger dialogue or trading logic
      break;
    case 'loot':
      // Trigger inventory pick-up logic
      break;
    case 'object':
      // Trigger world object interaction (doors, switches, etc.)
      break;
    default:
      console.warn(`[InteractionHandler] Unknown interaction type: ${msg.type}`);
  }
};

export { INTERACT_DISTANCE };