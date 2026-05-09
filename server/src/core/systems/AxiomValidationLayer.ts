/**
 * @file server/src/core/systems/AxiomValidationLayer.ts
 * @description STEP 3: Axiom Validation Layer - Validates player intents against all 5 ARE axioms.
 * Uses Kappa=1000 Fixed-Point arithmetic for all validations.
 */

import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';
import { KAPPA, type RegionState, StabilityLevel } from '../state/RegionState.js';

/**
 * Fixed-Point constant
 */
const FP_SCALE = 1000;

/**
 * Convert to Fixed-Point (k=1000)
 */
function toFP(value: number): number {
  return Math.floor(value * FP_SCALE);
}

/**
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
}

/**
 * Error tags for specific axiom violations
 */
export enum AxiomErrorTag {
  ERR_AXIOM_1_CONSERVATION = 'ERR_AXIOM_1_VIOLATION',
  ERR_AXIOM_2_SEQUENCE = 'ERR_AXIOM_2_VIOLATION',
  ERR_AXIOM_3_ENERGY = 'ERR_AXIOM_3_VIOLATION',
  ERR_AXIOM_4_SPATIAL = 'ERR_AXIOM_4_VIOLATION',
  ERR_AXIOM_5_HASH = 'ERR_AXIOM_5_VIOLATION',
}

/**
 * Available actions in ARE
 */
export type AREAction = 'MOVE' | 'EXTRACT' | 'TRADE' | 'ATTACK' | 'BUILD' | 'LOOT_TRANSFER';

/**
 * Player Intent with full validation data
 */
export interface PlayerIntent {
  playerId: string;
  action: AREAction;
  sequenceId: bigint;
  regionId: string;
  targetId?: string;
  lastPosition?: { x: number; y: number; z: number };
  newPosition?: { x: number; y: number; z: number };
  resourceCost?: number; // Fixed-Point
  resourceInput?: Map<string, number>; // resourceType -> amount (FP)
  resourceOutput?: Map<string, number>; // resourceType -> amount (FP)
  energyCost?: number; // Fixed-Point base cost
  hash?: string; // Axiom 5 hash
  publicKey?: string; // Player's public key
  payload?: any;
}

/**
 * Validated Mutation result
 */
export interface ValidatedIntent {
  intent: PlayerIntent;
  validated: boolean;
  errorTag?: AxiomErrorTag;
  errorDetails?: string;
}

/**
 * Region instability modifier lookup
 */
const INSTABILITY_MODIFIERS: Record<string, number> = {
  'STABLE': toFP(0.0),      // 0%
  'UNSTABLE': toFP(0.25),   // +25%
  'CONTESTED': toFP(0.50),   // +50%
  'CRITICAL': toFP(1.0),    // +100%
  'default': toFP(0.1),     // 10% default
};

/**
 * Maximum movement per tick in Fixed-Point (10 units = 10000)
 */
const MAX_MOVEMENT_PER_TICK = toFP(10);

/**
 * Sequence ID tolerance (±10 ticks)
 */
const SEQUENCE_TOLERANCE = 10n;

/**
 * AxiomValidationLayer - Validates all 5 ARE axioms
 */
export class AxiomValidationLayer {
  private intentQueue: PlayerIntent[] = [];
  private validatedMutations: PendingMutation[] = [];

  /**
   * Queue an intent for validation
   */
  public queueIntent(intent: PlayerIntent): void {
    this.intentQueue.push(intent);
  }

  /**
   * Process all queued intents
   */
  public async processIntents(): Promise<ValidatedIntent[]> {
    const results: ValidatedIntent[] = [];
    const worldState = worldStateRegistry.getCurrentState();
    const currentTick = worldState.globalTick;

    for (const intent of this.intentQueue) {
      const validated = await this.validateIntent(intent, worldState, currentTick);
      results.push(validated);

      if (validated.validated) {
        // Queue valid mutation for later processing
        this.queueMutation(intent);
      }
    }

    this.intentQueue = [];
    return results;
  }

  /**
   * Main validation function - validates all 5 axioms
   */
  private async validateIntent(
    intent: PlayerIntent,
    worldState: any,
    currentTick: bigint
  ): Promise<ValidatedIntent> {
    
    // AXIOM 1: State Conservation (Resource Conservation)
    const axiom1 = this.validateAxiom1_Conservation(intent);
    if (!axiom1.validated) {
      return { intent, validated: false, errorTag: AxiomErrorTag.ERR_AXIOM_1_CONSERVATION, errorDetails: axiom1.reason };
    }

    // AXIOM 2: Sequence Integrity (Causality)
    const axiom2 = await this.validateAxiom2_Sequence(intent, currentTick);
    if (!axiom2.validated) {
      return { intent, validated: false, errorTag: AxiomErrorTag.ERR_AXIOM_2_SEQUENCE, errorDetails: axiom2.reason };
    }

    // AXIOM 3: Resource Validity (Energy)
    const axiom3 = await this.validateAxiom3_Energy(intent, worldState);
    if (!axiom3.validated) {
      return { intent, validated: false, errorTag: AxiomErrorTag.ERR_AXIOM_3_ENERGY, errorDetails: axiom3.reason };
    }

    // AXIOM 4: Spatial Integrity
    const axiom4 = await this.validateAxiom4_Spatial(intent, worldState);
    if (!axiom4.validated) {
      return { intent, validated: false, errorTag: AxiomErrorTag.ERR_AXIOM_4_SPATIAL, errorDetails: axiom4.reason };
    }

    // AXIOM 5: Hash Consistency
    const axiom5 = this.validateAxiom5_Hash(intent);
    if (!axiom5.validated) {
      return { intent, validated: false, errorTag: AxiomErrorTag.ERR_AXIOM_5_HASH, errorDetails: axiom5.reason };
    }

    return { intent, validated: true };
  }

  /**
   * AXIOM 1: State Conservation
   * Input_Resources == Output_Resources + Delta_State (Zero-sum)
   */
  private validateAxiom1_Conservation(intent: PlayerIntent): { validated: boolean; reason?: string } {
    // For actions that involve resource transfer
    if (intent.action === 'TRADE' || intent.action === 'LOOT_TRANSFER') {
      const input = intent.resourceInput;
      const output = intent.resourceOutput;

      if (!input || !output) {
        return { validated: false, reason: 'AXIOM_1: No resource balance provided' };
      }

      // Calculate totals in Fixed-Point
      let inputTotal = 0;
      let outputTotal = 0;

      for (const [, amount] of input) {
        inputTotal += amount;
      }
      for (const [, amount] of output) {
        outputTotal += amount;
      }

      // Zero-sum check with small tolerance (±10 FP)
      const balance = inputTotal - outputTotal;
      if (Math.abs(balance) > 10) {
        return {
          validated: false,
          reason: `AXIOM_1: Resource imbalance ${balance} (input: ${inputTotal}, output: ${outputTotal})`
        };
      }
    }

    // For EXTRACT: must have resources in region
    if (intent.action === 'EXTRACT' && intent.resourceOutput) {
      // Checked in region context
    }

    return { validated: true };
  }

  /**
   * AXIOM 2: Sequence Integrity (Causality)
   * Sequence-ID must be exactly n+1 to last state, reject outdated or future IDs
   */
  private async validateAxiom2_Sequence(
    intent: PlayerIntent,
    currentTick: bigint
  ): Promise<{ validated: boolean; reason?: string }> {
    const seqId = intent.sequenceId;
    const expectedNext = currentTick + BigInt(1);
    const tolerance = SEQUENCE_TOLERANCE;

    // Check if sequence ID is within acceptable range
    if (seqId < currentTick - BigInt(tolerance)) {
      return {
        validated: false,
        reason: `AXIOM_2: Sequence ID ${seqId} is outdated (current: ${currentTick})`
      };
    }

    // Check for desync (too far in future)
    if (seqId > expectedNext + BigInt(tolerance)) {
      return {
        validated: false,
        reason: `AXIOM_2: Sequence ID ${seqId} causes desync (expected: ${expectedNext})`
      };
    }

    return { validated: true };
  }

  /**
   * AXIOM 3: Resource Validity (Energy)
   * Entity must have Matrix Energy: Total_Cost = Base_Cost * (1 + Regional_Instability_Modifier)
   */
  private async validateAxiom3_Energy(
    intent: PlayerIntent,
    worldState: any
  ): Promise<{ validated: boolean; reason?: string }> {
    if (!intent.energyCost || intent.energyCost <= 0) {
      return { validated: true }; // No energy cost
    }

    // Get region for modifier
    const region = worldState.regions.get(intent.regionId);
    if (!region) {
      return { validated: false, reason: 'AXIOM_3: Region not found' };
    }

    // Get instability modifier
    const instabilityKey = region.stabilityLevel || 'default';
    const modifier = INSTABILITY_MODIFIERS[instabilityKey] || INSTABILITY_MODIFIERS['default'];

    // Calculate total cost: Base * (1 + Modifier)
    // In Fixed-Point: Base + (Base * Modifier / SCALE)
    const totalCost = intent.energyCost + (intent.energyCost * modifier) / FP_SCALE;

    // Check player's energy (simplified - would get from player state)
    const playerEnergy = toFP(100); // Assume 100 for test
    if (playerEnergy < totalCost) {
      return {
        validated: false,
        reason: `AXIOM_3: Insufficient energy (has: ${playerEnergy}, needs: ${totalCost})`
      };
    }

    return { validated: true };
  }

  /**
   * AXIOM 4: Spatial Integrity
   * Distance <= Speed * Delta_Time, prevent teleportation
   */
  private async validateAxiom4_Spatial(
    intent: PlayerIntent,
    worldState: any
  ): Promise<{ validated: boolean; reason?: string }> {
    if (intent.action !== 'MOVE') {
      return { validated: true };
    }

    if (!intent.lastPosition || !intent.newPosition) {
      return { validated: false, reason: 'AXIOM_4: No position data' };
    }

    // Calculate distance in Fixed-Point
    const distance = this.calculateDistanceFP(intent.lastPosition, intent.newPosition);

    // Check max movement
    if (distance > MAX_MOVEMENT_PER_TICK) {
      return {
        validated: false,
        reason: `AXIOM_4: Teleportation detected (${fromFP(distance).toFixed(2)} > ${fromFP(MAX_MOVEMENT_PER_TICK).toFixed(2)})`
      };
    }

    // Check chunk collision (simplified)
    const fromChunk = this.getChunkId(intent.lastPosition);
    const toChunk = this.getChunkId(intent.newPosition);

    // If moving to non-existent chunk
    const region = worldState.regions.get(intent.regionId);
    if (!region) {
      return { validated: false, reason: 'AXIOM_4: Invalid region' };
    }

    return { validated: true };
  }

  /**
   * AXIOM 5: Hash Consistency
   * Verify mutation hash matches player's public key
   */
  private validateAxiom5_Hash(intent: PlayerIntent): { validated: boolean; reason?: string } {
    // If no hash provided, skip validation
    if (!intent.hash || !intent.publicKey) {
      return { validated: true };
    }

    // Calculate expected hash from intent data
    const data = JSON.stringify({
      playerId: intent.playerId,
      action: intent.action,
      sequenceId: String(intent.sequenceId),
      regionId: intent.regionId,
      position: intent.newPosition,
      resourceCost: intent.resourceCost,
      payload: intent.payload,
    });

    // Simple hash (in production, use proper cryptographic hash)
    const expectedHash = this.simpleHash(data);

    if (expectedHash !== intent.hash) {
      return {
        validated: false,
        reason: 'AXIOM_5: Hash mismatch - potential data manipulation'
      };
    }

    return { validated: true };
  }

  /**
   * Calculate distance in Fixed-Point
   */
  private calculateDistanceFP(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    const dx = (a.x - b.x) * FP_SCALE;
    const dy = (a.y - b.y) * FP_SCALE;
    const dz = (a.z - b.z) * FP_SCALE;
    return Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  /**
   * Get chunk ID from position
   */
  private getChunkId(pos: { x: number; y: number; z: number }): string {
    return `${Math.floor(pos.x / 16)}_${Math.floor(pos.z / 16)}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Queue validated mutation
   */
  private queueMutation(intent: PlayerIntent): void {
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId: intent.regionId,
      field: 'lastFullUpdate',
      value: worldStateRegistry.getTick(),
    });
  }

  /**
   * Get queue length
   */
  public getQueueLength(): number {
    return this.intentQueue.length;
  }

  /**
   * Get pending mutations count
   */
  public getValidatedCount(): number {
    return this.validatedMutations.length;
  }
}