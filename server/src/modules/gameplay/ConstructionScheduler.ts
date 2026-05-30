/**
 * ConstructionScheduler - Construction Efficiency Optimizer
 * 
 * Optimizes construction contracts within 40-unit radius.
 * Uses warfront_core as fuel to accelerate onClaimContract.
 * Prioritizes via Plexity weights: 45% Type, 35% HP, 20% Inverse Resonance.
 * Triggers visual world changes via profileResolver.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Contract {
  id: string;
  type: ContractType;
  hp: number;
  maxHp: number;
  resonance: number;
  position: Vector3;
  priority: number;
}

export enum ContractType {
  FOUNDATION = 'foundation',
  STRUCTURAL = 'structural',
  TECHNICAL = 'technical',
  FORTIFICATION = 'fortification'
}

export interface ScheduleResult {
  contractId: string;
  boostFactor: number;
  priority: number;
  wasFueled: boolean;
}

const SCAN_RADIUS = 40;
const FUEL_ITEM_ID = 'warfront_core';
const WEIGHT_TYPE = 0.45;
const WEIGHT_HP = 0.35;
const WEIGHT_RESONANCE = 0.20;

const TYPE_WEIGHT_MAP: Record<ContractType, number> = {
  [ContractType.FOUNDATION]: 0.8,
  [ContractType.STRUCTURAL]: 1.2,
  [ContractType.TECHNICAL]: 1.5,
  [ContractType.FORTIFICATION]: 2.0
};

function getDistanceSq(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function calculatePlexityPriority(contract: Contract): number {
  const typeWeight = TYPE_WEIGHT_MAP[contract.type] || 1.0;
  const hpRatio = contract.maxHp > 0 ? contract.hp / contract.maxHp : 0;
  const inverseResonance = contract.resonance > 0 ? 1 / contract.resonance : 1;
  
  return (typeWeight * WEIGHT_TYPE) + (hpRatio * WEIGHT_HP) + (inverseResonance * WEIGHT_RESONANCE);
}

async function hasWarfrontCore(playerId: string): Promise<boolean> {
  return (await import('../systems/InventorySystem')).inventorySystem.hasItem(playerId, FUEL_ITEM_ID, 1);
}

async function consumeWarfrontCore(playerId: string): Promise<boolean> {
  return (await import('../systems/InventorySystem')).inventorySystem.consumeItem(playerId, FUEL_ITEM_ID, 1);
}

async function dispatchBuilderNPCs(playerId: string, contractId: string, position: Vector3): Promise<void> {
  return (await import('../resolvers/ProfileResolver')).profileResolver.dispatchBuilderNPCs(playerId, contractId, position);
}

async function applyBoost(contractId: string, boostFactor: number): Promise<void> {
  return (await import('../systems/ContractManager')).contractManager.applyConstructionBoost(contractId, boostFactor);
}

export function getContractsInRadius(contracts: Contract[], position: Vector3, radius: number = SCAN_RADIUS): Contract[] {
  return contracts.filter(c => {
    const distSq = getDistanceSq(c.position, position);
    return distSq < (radius * radius);
  });
}

export function sortByPriority(contracts: Contract[]): Contract[] {
  return [...contracts].sort((a, b) => {
    const pA = calculatePlexityPriority(a);
    const pB = calculatePlexityPriority(b);
    return pB !== pA ? pB - pA : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

export class ConstructionScheduler {
  private constructor() {
    throw new Error('Static-only');
  }

  public static async optimizeContracts(
    playerId: string,
    position: Vector3,
    contracts: Contract[]
  ): Promise<ScheduleResult[]> {
    const results: ScheduleResult[] = [];
    const nearby = getContractsInRadius(contracts, position, SCAN_RADIUS);
    
    if (nearby.length === 0) return results;
    
    const sorted = sortByPriority(nearby);
    
    for (const contract of sorted) {
      const hasFuel = await hasWarfrontCore(playerId);
      const priority = calculatePlexityPriority(contract);
      
      if (!hasFuel) {
        results.push({ contractId: contract.id, boostFactor: priority, priority, wasFueled: false });
        continue;
      }
      
      const boostFactor = priority * 1.5;
      const consumed = await consumeWarfrontCore(playerId);
      
      if (!consumed) continue;
      
      await applyBoost(contract.id, boostFactor);
      await dispatchBuilderNPCs(playerId, contract.id, contract.position);
      
      results.push({ contractId: contract.id, boostFactor, priority, wasFueled: true });
    }
    
    return results;
  }

  public static async claimContract(playerId: string, contract: Contract): Promise<ScheduleResult> {
    const hasFuel = await hasWarfrontCore(playerId);
    const priority = calculatePlexityPriority(contract);
    const boostFactor = hasFuel ? priority * 1.5 : priority;
    
    if (hasFuel) {
      await consumeWarfrontCore(playerId);
      await applyBoost(contract.id, boostFactor);
      await dispatchBuilderNPCs(playerId, contract.id, contract.position);
    }
    
    return { contractId: contract.id, boostFactor, priority, wasFueled: hasFuel };
  }

  public static getPriority(contract: Contract): number {
    return calculatePlexityPriority(contract);
  }

  public static async canFuel(playerId: string): Promise<boolean> {
    return hasWarfrontCore(playerId);
  }
}

export default ConstructionScheduler;
