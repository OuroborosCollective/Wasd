import {
  INTERACT_DISTANCE_KAPPA,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot as SharedInteractWorldSnapshot,
  type ClosestInteractable,
  type KappaPoint2D
} from "@wasd/shared";

/**
 * Arelorian Interaction Utility (Client-Side)
 * Implements strict Kappa-Standard (1000) for deterministic interaction logic.
 * Part of the AxiomValidationLayer infrastructure.
 */

/**
 * Interface for interaction messages sent between client components or to the server.
 * Ensures the AxiomValidationLayer can parse the intent in the 10-Hz WorldTick.
 */
export interface InteractionMsg {
  type: 'npc' | 'loot' | 'object' | 'dialogue' | 'quest';
  id: string;
  action?: string;
  payload?: Record<string, any>;
  kappaPosition?: [number, number, number]; // [x, y, z] in Kappa units (1.0 = 1000)
}

/**
 * Determines the closest interactable object based on fixed-point player position.
 * Uses shared logic to maintain client-server parity (Stateless Determinism).
 * 
 * @param playerKappaPos - [x, y, z] position of the player in Kappa units
 * @param snapshot - The current WorldStateRegistry snapshot subset
 */
export const getClosestInteractable = (
  playerKappaPos: [number, number, number],
  snapshot: SharedInteractWorldSnapshot
): ClosestInteractable | null => {
  // Mapping 3D coordinates to 2D Top-Down plane (X, Z) for interaction checks
  const playerPoint: KappaPoint2D = { 
    x: playerKappaPos[0], 
    y: playerKappaPos[2] 
  };

  return sharedGetClosestInteractable(
    playerPoint, 
    snapshot
  );
};

/**
 * Validates and routes interaction logic within the 100ms tick window.
 * This function is synchronous to prevent race conditions in the WorldStateRegistry.
 * 
 * @param msg - The interaction intent message
 */
export const handleInteraction = (msg: InteractionMsg): void => {
  // Deterministic logging for the AxiomValidationLayer
  // console.log(`[InteractionHandler] Tick Execution: ${msg.type}:${msg.id}`);
  
  switch (msg.type) {
    case 'npc':
      // Trigger DialogueRegistry/TradeEngine logic
      break;
    case 'loot':
      // Trigger InventoryManager fixed-point proximity pick-up
      break;
    case 'object':
      // Trigger WorldObjectRegistry state mutation (Doors, Levers)
      break;
    case 'dialogue':
    case 'quest':
      // Process story-driven state transitions
      break;
    default:
      // Unknown types are ignored to maintain engine stability
      break;
  }
};

/**
 * Re-exporting INTERACT_DISTANCE_KAPPA for use in raycasting and distance checks.
 * Standard value: 2000 (2.0 world units).
 */
export { INTERACT_DISTANCE_KAPPA };