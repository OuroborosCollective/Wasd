import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { AREVector3, IAREPayload } from './AREPayload';
import { assertSafeInteger, kAdd, kSub, type KappaInt } from './Kappa';

/**
 * OUROBOROS SYSTEMIC EMERGENCE: ARENpcEvolution Utility AI
 * 
 * The brain of NPC decision-making. Operates under the dogma of
 * "Stateless Determinism" and ARE-Logic.
 * 
 * CORE AXIOMS:
 * 1. NPCs use EXACTLY the same systems as players (Conservation Axiom)
 * 2. Utility Scoring: ActionScore = (Drive * Reward) - Risk - Cost
 * 3. No Phantom Systems: Every logical decision has a server counterpart
 */

export interface AREFusionResult {
  readonly fused: boolean;
  readonly apex?: Readonly<IAREPayload>;
  readonly consumedEntityIds: readonly string[];
}

export interface ARECapsuleScanResult {
  readonly capsule: Readonly<IAREPayload> | null;
  readonly direction: Readonly<AREVector3> | null;
  readonly movementCost: KappaInt;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY AI TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type NPCAction =
  | 'IDLE'
  | 'GATHER_WOOD'
  | 'GATHER_STONE'
  | 'GATHER_IRON'
  | 'GATHER_FIBER'
  | 'CRAFT_WOODEN_CHEST'
  | 'CRAFT_IRON_CHEST'
  | 'CRAFT_EQUIPMENT'
  | 'STORE_ITEMS'
  | 'RETRIEVE_ITEMS'
  | 'FLEE'
  | 'ATTACK'
  | 'WANDER'
  | 'RETURN_HOME';

export interface DriveState {
  resourceNeed: KappaInt;      // 0-1000: How much NPC needs resources
  safetyNeed: KappaInt;        // 0-1000: How unsafe NPC feels
  wealthNeed: KappaInt;        // 0-1000: How much NPC wants to store wealth
  socialNeed: KappaInt;        // 0-1000: Territorial/social drives
}

export interface EnvironmentalEntity {
  entityId: string;
  entityType: 'RESOURCE' | 'STORAGE' | 'ENEMY' | 'ALLY' | 'NEUTRAL';
  resourceType?: 'tree' | 'rock' | 'iron' | 'fiber';
  position: AREVector3;
  distanceKappa: KappaInt;
  threat?: number;            // For enemies: 0-1
  value?: KappaInt;           // For resources/storages: value in kappa
}

export interface ActionScore {
  action: NPCAction;
  score: KappaInt;
  driveStrength: KappaInt;
  reward: KappaInt;
  risk: KappaInt;
  cost: KappaInt;
  targetEntity?: string;
  reason: string;
}

export interface UtilityIntelligence {
  drives: DriveState;
  environment: EnvironmentalEntity[];
  actionScores: ActionScore[];
  selectedAction: NPCAction;
  targetEntity?: string;
  tick: number;
}

export interface ScannedEnvironment {
  npcPosition: AREVector3;
  resources: EnvironmentalEntity[];
  enemies: EnvironmentalEntity[];
  allies: EnvironmentalEntity[];
  storages: EnvironmentalEntity[];
  neutrals: EnvironmentalEntity[];
}

const DEFAULT_CHUNK_SIZE = 64000;
const DEFAULT_VISION_RANGE_KAPPA = 5000;  // 5 meters in kappa
const SAFE_ENEMY_DISTANCE_KAPPA = 2000;   // 2 meters - too close = danger
const RESOURCE_VALUES: Record<string, KappaInt> = {
  tree: 100,
  rock: 150,
  iron: 300,
  fiber: 50,
};

function readInt(payload: Readonly<IAREPayload>, key: string): KappaInt {
  const value = payload[key];
  if (typeof value !== 'number') return 0;
  assertSafeInteger(value, key);
  return value;
}

function samePosition(a: Readonly<IAREPayload>, b: Readonly<IAREPayload>): boolean {
  return a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z;
}

function absK(value: KappaInt): KappaInt {
  return value < 0 ? -value : value;
}

function distance(a: Readonly<AREVector3>, b: Readonly<AREVector3>): KappaInt {
  return kAdd(kAdd(absK(kSub(a.x, b.x)), absK(kSub(a.y, b.y))), absK(kSub(a.z, b.z)));
}

function chunkKey(position: Readonly<AREVector3>, chunkSize: KappaInt): string {
  assertSafeInteger(chunkSize, 'chunk size');
  return `${Math.trunc(position.x / chunkSize)}:${Math.trunc(position.y / chunkSize)}:${Math.trunc(position.z / chunkSize)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function clampK(value: KappaInt, min: KappaInt, max: KappaInt): KappaInt {
  return Math.max(min, Math.min(max, value));
}

function calculateRiskScore(
  closestEnemy: EnvironmentalEntity | undefined,
  enemyThreshold: KappaInt
): KappaInt {
  if (!closestEnemy) return 0;
  
  if (closestEnemy.distanceKappa <= enemyThreshold) {
    // High risk: enemy very close
    const severity = kDiv(enemyThreshold - closestEnemy.distanceKappa, enemyThreshold);
    return kAdd(severity, (closestEnemy.threat ?? 0) * 500);
  }
  
  return (closestEnemy.threat ?? 0) * 200;
}

function calculateDriveFromInventory(
  inventorySlots: readonly (Readonly<{ id?: string; quantity?: number }> | null)[]
): { resourceNeed: KappaInt; hasWood: boolean; hasStone: boolean; hasIron: boolean } {
  let woodCount = 0;
  let stoneCount = 0;
  let ironCount = 0;
  
  for (const slot of inventorySlots) {
    if (!slot || !slot.id) continue;
    const id = slot.id;
    if (id.includes('wood')) woodCount += slot.quantity ?? 1;
    else if (id.includes('stone')) stoneCount += slot.quantity ?? 1;
    else if (id.includes('iron')) ironCount += slot.quantity ?? 1;
  }
  
  // Calculate resource need based on emptiness (inverse of abundance)
  const totalItems = woodCount + stoneCount + ironCount;
  const maxCapacity = 20;
  const resourceNeed = Math.max(0, maxCapacity - totalItems) * 50; // Scale 0-1000
  
  return {
    resourceNeed: clampK(resourceNeed, 0, 1000),
    hasWood: woodCount >= 5,
    hasStone: stoneCount >= 3,
    hasIron: ironCount >= 2,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARENpcEvolution - THE BRAIN
// ─────────────────────────────────────────────────────────────────────────────

export class ARENpcEvolution {
  // ─── Legacy Methods ───────────────────────────────────────────────────

  static fuseOnSameKappaCell(a: Readonly<IAREPayload>, b: Readonly<IAREPayload>): AREFusionResult {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(a);
      AREGuard.assertNoFloats(b);
      if (!samePosition(a, b)) return AREGuard.protectPayload({ fused: false, consumedEntityIds: [] });

      const hash = ((a.stateHash ?? AREHash.generate(a)) ^ (b.stateHash ?? AREHash.generate(b))) >>> 0;
      const apex: IAREPayload = {
        entityId: `apex:${hash.toString(16)}`,
        position: a.position,
        velocity: { x: 0, y: 0, z: 0 },
        stateHash: hash,
        kind: 'ApexNpc',
        behavior: 'territory_builder',
        energy: kAdd(readInt(a, 'energy'), readInt(b, 'energy')),
        health: kAdd(readInt(a, 'health'), readInt(b, 'health')),
        parents: [a.entityId, b.entityId],
      };
      AREGuard.assertNoFloats(apex);
      return AREGuard.protectPayload({ fused: true, apex: AREGuard.protectPayload(apex), consumedEntityIds: [a.entityId, b.entityId] });
    });
  }

  static scanOwnChunkForCapsule(npc: Readonly<IAREPayload>, capsules: readonly Readonly<IAREPayload>[], chunkSize: KappaInt = DEFAULT_CHUNK_SIZE): ARECapsuleScanResult {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(npc);
      const own = chunkKey(npc.position, chunkSize);
      let best: Readonly<IAREPayload> | null = null;
      let bestDistance: KappaInt | null = null;

      for (const capsule of capsules) {
        AREGuard.assertNoFloats(capsule);
        if (capsule.kind !== 'EnergyCapsule') continue;
        if (chunkKey(capsule.position, chunkSize) !== own) continue;
        const d = distance(npc.position, capsule.position);
        if (bestDistance === null || d < bestDistance || (d === bestDistance && capsule.entityId < (best?.entityId ?? ''))) {
          best = capsule;
          bestDistance = d;
        }
      }

      if (!best) return AREGuard.protectPayload({ capsule: null, direction: null, movementCost: 0 });
      const direction = AREGuard.protectPayload({ x: kSub(best.position.x, npc.position.x), y: kSub(best.position.y, npc.position.y), z: kSub(best.position.z, npc.position.z) });
      return AREGuard.protectPayload({ capsule: best, direction, movementCost: bestDistance ?? 0 });
    });
  }

  // ─── NEW UTILITY AI METHODS ───────────────────────────────────────────

  /**
   * Scan NPC environment for entities within vision range.
   * Returns categorized entities with KAPPA-distance precomputed.
   */
  static scanEnvironment(
    npcPosition: Readonly<AREVector3>,
    worldEntities: readonly Readonly<IAREPayload>[],
    visionRangeKappa: KappaInt = DEFAULT_VISION_RANGE_KAPPA
  ): ScannedEnvironment {
    return AREGuard.executeProtected(() => {
      AREGuard.assertNoFloats(npcPosition);

      const result: ScannedEnvironment = {
        npcPosition,
        resources: [],
        enemies: [],
        allies: [],
        storages: [],
        neutrals: [],
      };

      for (const entity of worldEntities) {
        AREGuard.assertNoFloats(entity);
        
        const entityPos = entity.position;
        const dist = distance(npcPosition, entityPos);
        
        if (dist > visionRangeKappa) continue;

        const scanned: EnvironmentalEntity = {
          entityId: String(entity.entityId),
          entityType: (entity.kind as EnvironmentalEntity['entityType']) ?? 'NEUTRAL',
          position: entityPos,
          distanceKappa: dist,
          resourceType: entity.resourceType as EnvironmentalEntity['resourceType'],
          threat: entity.threat as number | undefined,
          value: entity.value as KappaInt | undefined,
        };

        switch (scanned.entityType) {
          case 'RESOURCE':
            scanned.value ??= RESOURCE_VALUES[String(entity.resourceType)] ?? 50;
            result.resources.push(scanned);
            break;
          case 'ENEMY':
            result.enemies.push(scanned);
            break;
          case 'ALLY':
            result.allies.push(scanned);
            break;
          case 'STORAGE':
            result.storages.push(scanned);
            break;
          default:
            result.neutrals.push(scanned);
        }
      }

      // Sort all by distance (closest first)
      const sortByDist = (a: EnvironmentalEntity, b: EnvironmentalEntity) =>
        a.distanceKappa - b.distanceKappa;

      result.resources.sort(sortByDist);
      result.enemies.sort(sortByDist);
      result.allies.sort(sortByDist);
      result.storages.sort(sortByDist);
      result.neutrals.sort(sortByDist);

      return AREGuard.protectPayload(result);
    });
  }

  /**
   * Calculate internal drive state from NPC circumstances.
   * Drives represent internal motivation vectors.
   */
  static calculateDrives(
    npcState: {
      health: number;
      maxHealth: number;
      energy: number;
      maxEnergy: number;
    },
    inventorySlots: readonly (Readonly<{ id?: string } | null)[],
    closestEnemy: EnvironmentalEntity | undefined,
    ownedStorages: number
  ): DriveState {
    return AREGuard.executeProtected(() => {
      // Resource need from inventory
      const inventoryAnalysis = calculateDriveFromInventory(inventorySlots);
      
      // Safety need: enemy proximity
      const safetyNeed = clampK(
        calculateRiskScore(closestEnemy, SAFE_ENEMY_DISTANCE_KAPPA),
        0,
        1000
      );

      // Wealth need: want more storage capacity
      const storageCapacity = ownedStorages * 12; // Each storage = 12 slots
      const wealthNeed = ownedStorages === 0
        ? 800  // High need if no storage
        : 200; // Low need if has storage

      // Social/territorial need (simplified)
      const socialNeed = 100; // Placeholder

      return AREGuard.protectPayload({
        resourceNeed: inventoryAnalysis.resourceNeed,
        safetyNeed,
        wealthNeed,
        socialNeed,
      } satisfies DriveState);
    });
  }

  /**
   * Evaluate all possible actions and calculate utility scores.
   * ActionScore = (Drive * Reward) - Risk - Cost
   */
  static evaluateActions(
    drives: Readonly<DriveState>,
    environment: Readonly<ScannedEnvironment>,
    inventoryHasIngredients: {
      wood: boolean;
      stone: boolean;
      iron: boolean;
    }
  ): ActionScore[] {
    return AREGuard.executeProtected(() => {
      const scores: ActionScore[] = [];

      const closestResource = environment.resources[0];
      const closestEnemy = environment.enemies[0];
      const closestStorage = environment.storages.find(s => s.entityId.includes('chest'));

      // ── GATHER_WOOD ──
      if (closestResource?.resourceType === 'tree') {
        const gatherRisk = calculateRiskScore(closestEnemy, SAFE_ENEMY_DISTANCE_KAPPA);
        const gatherCost = closestResource.distanceKappa;
        const gatherReward = RESOURCE_VALUES.tree;
        const driveStrength = drives.resourceNeed;
        
        scores.push({
          action: 'GATHER_WOOD',
          score: kSub(kSub(kMul(driveStrength, gatherReward), gatherRisk), gatherCost),
          driveStrength,
          reward: gatherReward,
          risk: gatherRisk,
          cost: gatherCost,
          targetEntity: closestResource.entityId,
          reason: closestEnemy
            ? `Gather wood: enemy at ${closestEnemy.distanceKappa}K, risk ${gatherRisk}`
            : `Gather wood: tree at ${closestResource.distanceKappa}K`,
        });
      }

      // ── GATHER_STONE ──
      if (closestResource?.resourceType === 'rock') {
        const gatherRisk = calculateRiskScore(closestEnemy, SAFE_ENEMY_DISTANCE_KAPPA);
        const gatherCost = closestResource.distanceKappa;
        const gatherReward = RESOURCE_VALUES.rock;

        scores.push({
          action: 'GATHER_STONE',
          score: kSub(kSub(kMul(drives.resourceNeed, gatherReward), gatherRisk), gatherCost),
          driveStrength: drives.resourceNeed,
          reward: gatherReward,
          risk: gatherRisk,
          cost: gatherCost,
          targetEntity: closestResource.entityId,
          reason: `Gather stone: rock at ${closestResource.distanceKappa}K`,
        });
      }

      // ── CRAFT_WOODEN_CHEST ──
      if (inventoryHasIngredients.wood) {
        const craftRisk = calculateRiskScore(closestEnemy, SAFE_ENEMY_DISTANCE_KAPPA);
        const craftCost = 100; // Fixed crafting cost
        const craftReward = 500; // Value of storage
        const driveStrength = drives.wealthNeed;

        scores.push({
          action: 'CRAFT_WOODEN_CHEST',
          score: kSub(kSub(kMul(driveStrength, craftReward), craftRisk), craftCost),
          driveStrength,
          reward: craftReward,
          risk: craftRisk,
          cost: craftCost,
          reason: `Craft chest: wood available, wealth need ${drives.wealthNeed}`,
        });
      }

      // ── STORE_ITEMS ──
      if (closestStorage) {
        const storeRisk = calculateRiskScore(closestEnemy, SAFE_ENEMY_DISTANCE_KAPPA);
        const storeCost = closestStorage.distanceKappa;
        const storeReward = 200; // Value of organization
        const driveStrength = drives.wealthNeed;

        scores.push({
          action: 'STORE_ITEMS',
          score: kSub(kSub(kMul(driveStrength, storeReward), storeRisk), storeCost),
          driveStrength,
          reward: storeReward,
          risk: storeRisk,
          cost: storeCost,
          targetEntity: closestStorage.entityId,
          reason: `Store items: chest at ${closestStorage.distanceKappa}K`,
        });
      }

      // ── FLEE ──
      if (closestEnemy && closestEnemy.distanceKappa <= SAFE_ENEMY_DISTANCE_KAPPA) {
        const fleeCost = closestEnemy.distanceKappa + 500; // Escape cost
        const fleeReward = drives.safetyNeed;
        const driveStrength = drives.safetyNeed;

        scores.push({
          action: 'FLEE',
          score: kSub(kMul(driveStrength, fleeReward), fleeCost),
          driveStrength,
          reward: fleeReward,
          risk: 0,
          cost: fleeCost,
          reason: `FLEE: enemy at ${closestEnemy.distanceKappa}K, safety need ${drives.safetyNeed}`,
        });
      }

      // ── IDLE (default) ──
      scores.push({
        action: 'IDLE',
        score: 0,
        driveStrength: 0,
        reward: 0,
        risk: 0,
        cost: 0,
        reason: 'Idle: no compelling action',
      });

      return AREGuard.protectPayload(scores);
    });
  }

  /**
   * Select the best action based on highest utility score.
   */
  static selectBestAction(actionScores: readonly ActionScore[]): ActionScore {
    return AREGuard.executeProtected(() => {
      let best = actionScores[0];
      
      for (let i = 1; i < actionScores.length; i++) {
        const current = actionScores[i];
        // Select action with highest score
        if (current.score > (best?.score ?? Number.MIN_SAFE_INTEGER)) {
          best = current;
        }
      }

      return AREGuard.protectPayload(best ?? {
        action: 'IDLE' as const,
        score: 0,
        driveStrength: 0,
        reward: 0,
        risk: 0,
        cost: 0,
        reason: 'No action available',
      });
    });
  }

  /**
   * Main entry point: Compute full utility intelligence for NPC.
   * This is the "brain" that decides what NPC will do next.
   */
  static computeUtilityIntelligence(
    npcState: {
      id: string;
      health: number;
      maxHealth: number;
      energy: number;
      maxEnergy: number;
      position: AREVector3;
    },
    inventorySlots: readonly (Readonly<{ id?: string } | null)[],
    worldEntities: readonly Readonly<IAREPayload>[],
    ownedStorageCount: number,
    tick: number
  ): UtilityIntelligence {
    return AREGuard.executeProtected(() => {
      // Step 1: Scan environment
      const environment = ARENpcEvolution.scanEnvironment(
        npcState.position,
        worldEntities
      );

      // Step 2: Calculate drives
      const drives = ARENpcEvolution.calculateDrives(
        npcState,
        inventorySlots,
        environment.enemies[0],
        ownedStorageCount
      );

      // Step 3: Check inventory for crafting ingredients
      const inventoryAnalysis = calculateDriveFromInventory(inventorySlots);

      // Step 4: Evaluate all possible actions
      const actionScores = ARENpcEvolution.evaluateActions(
        drives,
        environment,
        {
          wood: inventoryAnalysis.hasWood,
          stone: inventoryAnalysis.hasStone,
          iron: inventoryAnalysis.hasIron,
        }
      );

      // Step 5: Select best action
      const selected = ARENpcEvolution.selectBestAction(actionScores);

      return AREGuard.protectPayload({
        drives,
        environment,
        actionScores,
        selectedAction: selected.action,
        targetEntity: selected.targetEntity,
        tick,
      });
    });
  }

  /**
   * Generate NPC crafting intent payload.
   * When brain decides CRAFT_CHEST, this creates the deterministic intent.
   */
  static generateCraftingIntent(
    npcId: string,
    recipeId: string,
    tick: number
  ): Readonly<{ npcId: string; type: 'npc_craft'; recipeId: string; tick: number; kappaHash: string }> {
    return AREGuard.executeProtected(() => {
      const kappaHash = AREHash.generate({
        npcId,
        recipeId,
        tick,
        intent: 'CRAFT',
      }).toString(16);

      return AREGuard.protectPayload({
        npcId,
        type: 'npc_craft',
        recipeId,
        tick,
        kappaHash,
      });
    });
  }

  /**
   * Generate resource gathering intent payload.
   * When brain decides GATHER_WOOD, this creates the deterministic intent.
   */
  static generateGatherIntent(
    npcId: string,
    resourceNodeId: string,
    resourceType: string,
    tick: number
  ): Readonly<{ npcId: string; type: 'npc_gather'; resourceNodeId: string; resourceType: string; tick: number; kappaHash: string }> {
    return AREGuard.executeProtected(() => {
      const kappaHash = AREHash.generate({
        npcId,
        resourceNodeId,
        resourceType,
        tick,
        intent: 'GATHER',
      }).toString(16);

      return AREGuard.protectPayload({
        npcId,
        type: 'npc_gather',
        resourceNodeId,
        resourceType,
        tick,
        kappaHash,
      });
    });
  }
}
