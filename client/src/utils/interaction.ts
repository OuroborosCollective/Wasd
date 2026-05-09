import {
  INTERACT_DISTANCE,
  getClosestNpc as sharedGetClosestNpc,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot as SharedInteractWorldSnapshot,
  type ClosestInteractable,
  type InteractNpcSnapshot,
  type InteractLootSnapshot,
  type InteractPoint as SharedInteractPoint,
} from "../../../shared/src";

/**
 * Interface for interaction messages sent between client components or to the server.
 * Stays compliant with the stateless ARE-logik.
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
 * 
 * Note: Position values use Kappa-standard internally via the shared logic, 
 * but are passed here as raw coordinates for the wrapper.
 */
export const getClosestInteractable = (
  playerPos: [number, number, number],
  snapshot: SharedInteractWorldSnapshot
): ClosestInteractable | null => {
  // playerPos[0] = x, playerPos[2] = z (Arelorian uses Y-up, but 2D logic uses X/Z)
  return sharedGetClosestInteractable({ position: { x: playerPos[0], y: playerPos[2] } }, snapshot);
};

/**
 * Handles the interaction logic based on the provided interaction message.
 * Acts as the client-side entry point for Axiom-validated actions.
 */
export const handleInteraction = (msg: InteractionMsg): void => {
  console.log(`[InteractionHandler] Processing interaction: ${msg.type} (ID: ${msg.id})`, msg);
  
  switch (msg.type) {
    case 'npc':
      // Trigger dialogue or trading logic - processed in next WorldTick
      break;
    case 'loot':
      // Trigger inventory pick-up logic - processed in next WorldTick
      break;
    case 'object':
      // Trigger world object interaction (doors, switches, etc.)
      break;
    default:
      console.warn(`[InteractionHandler] Unknown interaction type: ${msg.type}`);
  }
};

export { INTERACT_DISTANCE };