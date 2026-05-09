Hier ist die bereinigte und korrigierte Version der `client/src/utils/interaction.ts`, die strikt den `@wasd/shared` Alias nutzt, um die Workspace-Auflösung via pnpm sicherzustellen und die Arelorian-Standards (Kappa-Logik, deterministische Snapshots) zu wahren.

typescript
/**
 * Arelorian Interaction Utility (Client-Side)
 * Part of the OuroborosCollective/Wasd Repository.
 * Uses Kappa-Standard Fixed-Point Math where applicable via Shared logic.
 */

import {
  INTERACT_DISTANCE,
  getClosestInteractable as sharedGetClosestInteractable,
  type InteractWorldSnapshot as SharedInteractWorldSnapshot,
  type ClosestInteractable,
} from "@wasd/shared";

/**
 * Interface for interaction messages sent between client components or to the server.
 * Ensures the AxiomValidationLayer can parse the intent.
 */
export interface InteractionMsg {
  type: 'npc' | 'loot' | 'object' | 'dialogue' | 'quest';
  id: string;
  action?: string;
  payload?: Record<string, any>;
  position?: [number, number, number]; // [x, y, z] in Kappa units (or world units)
}

/**
 * Determines the closest interactable object (NPC, Loot, or Point) based on player position.
 * Uses the shared logic from @wasd/shared to ensure client-server parity.
 * 
 * @param playerPos - [x, y, z] position of the player
 * @param snapshot - The current WorldStateRegistry snapshot subset for interaction
 */
export const getClosestInteractable = (
  playerPos: [number, number, number],
  snapshot: SharedInteractWorldSnapshot
): ClosestInteractable | null => {
  // Transformation to the format expected by shared logic (Fixed-Point/Kappa handled inside shared)
  return sharedGetClosestInteractable(
    { 
      position: { 
        x: playerPos[0], 
        y: playerPos[2] // Mapping 3D Y to 2D Top-Down Y logic if applicable
      } 
    }, 
    snapshot
  );
};

/**
 * Handles the interaction logic based on the provided interaction message.
 * This is the entry point for the 10-Hz Tick driven interaction processing.
 */
export const handleInteraction = (msg: InteractionMsg): void => {
  // Deterministic check: Every interaction must be validatable by the AxiomValidationLayer
  console.log(`[InteractionHandler] Processing interaction: ${msg.type} (ID: ${msg.id})`, msg);
  
  switch (msg.type) {
    case 'npc':
      // TODO: Dispatch to DialogueSystem or TradeEngine
      break;
    case 'loot':
      // TODO: Dispatch to InventoryManager.tryPickUp(msg.id)
      break;
    case 'object':
      // TODO: Dispatch to WorldObjectRegistry (doors, switches)
      break;
    case 'dialogue':
    case 'quest':
      // Specific logic for story-driven interactions
      break;
    default:
      console.warn(`[InteractionHandler] Unknown interaction type: ${msg.type}`);
  }
};

export { INTERACT_DISTANCE };


### Änderungen & Einhaltung der Regeln:
1.  **Import-Fix**: Alle relativen Pfade (`../../../shared/src`) wurden durch das Workspace-Paket `@wasd/shared` ersetzt. Dies löst den `UNRESOLVED_IMPORT` Fehler in einer pnpm/Turbo-Umgebung auf.
2.  **Stateless Determinism**: Die Funktion `getClosestInteractable` bleibt zustandslos und nimmt einen Snapshot entgegen, was der ARE-Logik (Arelorian Runtime Engine) entspricht.
3.  **Typsicherheit**: Die Typen werden direkt aus dem Shared-Paket bezogen, um sicherzustellen, dass Client und Server dasselbe Verständnis von "InteractionDistance" und "Snapshots" haben.
4.  **Kein Rust/Keine Floats**: Der Code ist reines TypeScript und bereitet die Daten für die Kappa-basierte Berechnung im Shared-Modul vor.