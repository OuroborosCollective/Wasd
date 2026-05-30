/**
 * CombatFXEventBridge - Connects Server Events to CombatFXManager
 * 
 * ARCHITECTURE:
 * - Server Authority: This bridge ONLY listens to server-sent events
 * - O(1) Resolution: Uses actorSpriteMap from CombatFXManager for instant lookup
 * - Strict Decoupling: No mutation of HP or logical entity state
 * 
 * EVENT FLOW:
 * 1. Server sends COMBAT_RESULT (or similar combat event)
 * 2. Bridge extracts targetId, amount, isMiss
 * 3. O(1) lookup of target sprite position
 * 4. CombatFXManager spawns visual FX
 */

import type { NetworkClient } from "../networkClient";
import type { CombatFXManager } from "./CombatFXManager";

/** Combat result payload from server */
interface CombatResultPayload {
  targetId?: string;
  defenderId?: string;
  attackerId?: string;
  damage?: number;
  amount?: number;
  isMiss?: boolean;
  kind?: string;
}

/** Generic server event wrapper */
interface ServerEvent {
  type?: string;
  payload?: CombatResultPayload;
}

/**
 * Initialize combat event listeners that trigger visual FX.
 * 
 * @param client - Network client (from createClient)
 * @param fxManager - CombatFXManager instance with actorSpriteMap
 */
export function initCombatFXBridge(
  client: NetworkClient,
  fxManager: CombatFXManager
): void {
  /**
   * Extract target ID from payload.
   * Server may use different field names.
   */
  function extractTargetId(payload: CombatResultPayload): string | null {
    return payload.targetId ?? payload.defenderId ?? null;
  }

  /**
   * Extract damage amount from payload.
   * Server may use different field names.
   */
  function extractDamage(payload: CombatResultPayload): number {
    return Number(payload.damage ?? payload.amount ?? 0);
  }

  /**
   * Handle combat result event from server.
   * Spawns damage number and hit flash if target exists.
   */
  function onCombatResult(event: ServerEvent): void {
    const payload = event?.payload;
    if (!payload) return;

    // Skip non-hit events (blocks, dodges, etc.)
    if (payload.kind && payload.kind !== "hit" && payload.kind !== "damage") return;

    const targetId = extractTargetId(payload);
    if (!targetId) return;

    // O(1) lookup - get sprite from actor map
    const targetSprite = fxManager["actorSpriteMap"].get(targetId);
    
    // Only spawn FX if target is visible (sprite exists in map)
    if (!targetSprite) return;

    const damage = extractDamage(payload);
    const isMiss = Boolean(payload.isMiss);

    // Spawn at current sprite position
    // Using current position ensures FX tracks moving targets
    const x = targetSprite.x;
    const y = targetSprite.y;

    // Spawn floating damage number
    fxManager.spawnDamageNumber(x, y, damage, isMiss);

    // Spawn hit flash (red tint) if this was a hit, not a miss
    if (!isMiss && damage > 0) {
      fxManager.spawnHitFlash(targetId);
    }
  }

  /**
   * Handle combat feedback from server (alternative event name).
   */
  function onCombatFeedback(event: ServerEvent): void {
    const payload = event?.payload;
    if (!payload) return;

    const targetId = extractTargetId(payload);
    if (!targetId) return;

    // O(1) lookup
    const targetSprite = fxManager["actorSpriteMap"].get(targetId);
    if (!targetSprite) return;

    const damage = extractDamage(payload);
    const isMiss = Boolean(payload.isMiss);

    // Spawn FX at current position
    fxManager.spawnDamageNumber(targetSprite.x, targetSprite.y, damage, isMiss);
    
    if (!isMiss && damage > 0) {
      fxManager.spawnHitFlash(targetId);
    }
  }

  /**
   * Handle damage broadcast from server.
   */
  function onDamageBroadcast(event: ServerEvent): void {
    onCombatResult(event);  // Delegate to main handler
  }

  // Register listeners on network client
  // These events are sent by the server when combat occurs
  client.on("combat_result", onCombatResult);
  client.on("combat_feedback", onCombatFeedback);
  client.on("COMBAT_RESULT", onCombatResult);
  client.on("COMBAT_FEEDBACK", onCombatFeedback);
  client.on("damage", onDamageBroadcast);

  // Also listen on window events (for cross-component communication)
  if (typeof window !== "undefined") {
    window.addEventListener("wasd:combat-result", ((event: CustomEvent<ServerEvent>) => {
      onCombatResult(event.detail);
    }) as EventListener);

    window.addEventListener("wasd:network-packet", ((event: CustomEvent<{ event: string; payload: any }>) => {
      const { event: type, payload } = event.detail;
      if (type === "COMBAT_RESULT" || type === "combat_result" || type === "combat_feedback") {
        onCombatResult({ type, payload });
      }
    }) as EventListener);
  }
}