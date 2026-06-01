/**
 * PerceptionLogic - Deterministic Stealth Route (Cognitive Logic)
 * 
 * Deterministic perception WITHOUT Raycasting.
 * Uses Squared-Distance Heuristik with individual phaseShift (entity offset)
 * for visibility checks in 10-Hz tick.
 * 
 * Formula: visibilityThreshold = 225 * (1.0 + npc.phaseShift / 1000)
 * 
 * Prevents synchronous discovery in NPC groups through phase shift.
 * Cheat-proof stealth gameplay through full server authority.
 * 
 * NO RAYCASTING - Pure mathematical distance calculation.
 */

import { createARESeed, SeededARERng } from '../../core/determinism/AREDeterminism.js';
import type { EntityState } from '../types/index.js';

/**
 * Visibility Result
 */
export interface VisibilityResult {
  /** Whether target is visible */
  visible: boolean;
  /** Distance squared */
  distanceSquared: number;
  /** Raw distance */
  distance: number;
  /** Visibility threshold at this position */
  threshold: number;
  /** Detection chance (0-100) */
  detectionChance: number;
}

/**
 * NPC Perception State
 */
export interface PerceptionState {
  npcId: string;
  position: { x: number; y: number; z: number };
  phaseShift: number;
  perceptionRadius: number;
  lastPerceptionTick: number;
}

/**
 * Player Stealth State
 */
export interface StealthState {
  playerId: string;
  position: { x: number; y: number; z: number };
  stealthLevel: number;  // 0-100, higher = harder to detect
  isCrouching: boolean;
  lastVisibleTick: number;
}

/**
 * Base visibility threshold constant
 * 225 = 15 units squared (15^2 = 225)
 */
export const BASE_VISIBILITY_THRESHOLD = 225;

/**
 * Default perception radius
 */
export const DEFAULT_PERCEPTION_RADIUS = 15;

/**
 * Update tick interval (10-Hz = 100ms)
 */
export const PERCEPTION_TICK_MS = 100;

/**
 * Calculate squared distance between two positions
 * Pure function - no side effects
 */
export function calculateDistanceSquared(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number }
): number {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const dz = from.z - to.z;
  return (dx * dx) + (dy * dy) + (dz * dz);
}

/**
 * Calculate visibility threshold for NPC perception
 * Uses phaseShift to desynchronize NPC groups
 * 
 * Formula: 225 * (1.0 + npc.phaseShift / 1000)
 */
export function calculateVisibilityThreshold(phaseShift: number): number {
  // Clamp phaseShift to reasonable range
  const clampedPhase = Math.max(-500, Math.min(500, phaseShift));
  return BASE_VISIBILITY_THRESHOLD * (1.0 + clampedPhase / 1000);
}

/**
 * Check if target is visible to NPC (deterministic)
 * 
 * NO RAYCASTING - purely mathematical distance check
 */
export function checkStealthDeterministic(
  npc: PerceptionState,
  player: StealthState
): VisibilityResult {
  // Calculate distance squared (O(1))
  const distanceSquared = calculateDistanceSquared(
    npc.position,
    player.position
  );

  // Calculate threshold using phaseShift
  const threshold = calculateVisibilityThreshold(npc.phaseShift);

  // Check visibility
  const visible = distanceSquared <= threshold;

  // Detection chance based on distance and stealth level
  // Closer = higher chance, higher stealth = lower chance
  let detectionChance = 0;
  
  if (visible) {
    const normalizedDist = Math.sqrt(distanceSquared) / Math.sqrt(threshold);
    const distanceBonus = (1 - normalizedDist) * 50;  // 0-50 based on proximity
    const stealthPenalty = player.stealthLevel * 0.3;  // Reduce by stealth
    const crouchBonus = player.isCrouching ? 20 : 0;  // Extra crouch bonus
    
    detectionChance = Math.min(
      100,
      Math.max(0, 50 + distanceBonus - stealthPenalty + crouchBonus)
    );
  }

  return {
    visible,
    distanceSquared,
    distance: Math.sqrt(distanceSquared),
    threshold,
    detectionChance: Math.round(detectionChance)
  };
}

/**
 * Check multiple NPCs' perception (desynchronized)
 * 
 * Each NPC has unique phaseShift preventing synchrony
 */
export function checkGroupPerception(
  npcs: PerceptionState[],
  player: StealthState
): Map<string, VisibilityResult> {
  const results = new Map<string, VisibilityResult>();

  for (const npc of npcs) {
    const result = checkStealthDeterministic(npc, player);
    results.set(npc.npcId, result);
  }

  return results;
}

/**
 * Calculate phaseShift for NPC (deterministic)
 * Based on NPC ID hash to create unique offset
 */
export function calculatePhaseShift(npcId: string): number {
  // Simple hash for deterministic phase shift
  let hash = 0;
  for (let i = 0; i < npcId.length; i++) {
    const char = npcId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Convert to range -200 to +200
  const phaseShift = (hash % 401) - 200;
  return phaseShift;
}

function deterministicDetectionRoll(npc: PerceptionState, player: StealthState, currentTick: number): number {
  const rng = new SeededARERng(createARESeed([
    'perception',
    npc.npcId,
    player.playerId,
    currentTick,
    npc.phaseShift,
    Math.round(npc.position.x * 1000),
    Math.round(npc.position.z * 1000),
    Math.round(player.position.x * 1000),
    Math.round(player.position.z * 1000),
  ]));
  return rng.nextFloat() * 100;
}

/**
 * Tick-based perception updates
 * Called every 10-Hz tick
 */
export class PerceptionTicker {
  private lastTick: number = 0;
  private npcStates: Map<string, PerceptionState> = new Map();

  /**
   * Register NPC for perception updates
   */
  public registerNPC(
    npcId: string,
    position: { x: number; y: number; z: number },
    phaseShift?: number
  ): void {
    this.npcStates.set(npcId, {
      npcId,
      position,
      phaseShift: phaseShift ?? calculatePhaseShift(npcId),
      perceptionRadius: DEFAULT_PERCEPTION_RADIUS,
      lastPerceptionTick: 0
    });
  }

  /**
   * Update NPC position
   */
  public updateNPCPosition(
    npcId: string,
    position: { x: number; y: number; z: number }
  ): void {
    const state = this.npcStates.get(npcId);
    if (state) {
      state.position = position;
    }
  }

  /**
   * Process perception for tick
   * Returns entities that detected the player
   */
  public processTick(
    player: StealthState,
    currentTick: number
  ): string[] {
    // Only process every PERCEPTION_TICK_MS
    if (currentTick - this.lastTick < PERCEPTION_TICK_MS) {
      return [];
    }

    this.lastTick = currentTick;
    const detectedBy: string[] = [];
    const sortedNpcStates = Array.from(this.npcStates.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );

    for (const [npcId, npcState] of sortedNpcStates) {
      npcState.lastPerceptionTick = currentTick;
      
      const result = checkStealthDeterministic(npcState, player);
      
      // Roll for detection based on deterministic chance
      if (result.visible && deterministicDetectionRoll(npcState, player, currentTick) < result.detectionChance) {
        detectedBy.push(npcId);
      }
    }

    return detectedBy;
  }

  /**
   * Get NPC perception state
   */
  public getNPCState(npcId: string): PerceptionState | undefined {
    return this.npcStates.get(npcId);
  }

  /**
   * Remove NPC from perception
   */
  public removeNPC(npcId: string): void {
    this.npcStates.delete(npcId);
  }
}

/**
 * Default perception state factory
 */
export function createPerceptionState(
  npcId: string,
  position: { x: number; y: number; z: number }
): PerceptionState {
  return {
    npcId,
    position,
    phaseShift: calculatePhaseShift(npcId),
    perceptionRadius: DEFAULT_PERCEPTION_RADIUS,
    lastPerceptionTick: 0
  };
}

/**
 * Default stealth state factory
 */
export function createStealthState(
  playerId: string,
  position: { x: number; y: number; z: number },
  stealthLevel: number = 0,
  isCrouching: boolean = false
): StealthState {
  return {
    playerId,
    position,
    stealthLevel,
    isCrouching,
    lastVisibleTick: 0
  };
}
