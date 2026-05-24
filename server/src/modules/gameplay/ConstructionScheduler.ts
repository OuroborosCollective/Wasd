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

async function hasWarfrontCore(playerId: string, amount: number = 1): Promise<boolean> {
  const { inventorySystem } = await import('../systems/InventorySystem');
  return inventorySystem.hasItem(playerId, FUEL_ITEM_ID, amount);
}

async function consumeWarfrontCore(playerId: string, amount: number = 1): Promise<boolean> {
  const { inventorySystem } = await import('../systems/InventorySystem');
  return inventorySystem.consumeItem(playerId, FUEL_ITEM_ID, amount);
}

async function dispatchBuilderNPCs(playerId: string, contractId: string, position: Vector3): Promise<void> {
  const { profileResolver } = await import('../resolvers/ProfileResolver');
  return profileResolver.dispatchBuilderNPCs(playerId, contractId, position);
}

async function applyBoost(contractId: string, boostFactor: number): Promise<void> {
  const { contractManager } = await import('../systems/ContractManager');
  return contractManager.applyConstructionBoost(contractId, boostFactor);
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
    return pB !== pA ? pB - pA : a.id.localeCompare(b.id);
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
    const nearby = getContractsInRadius(contracts, position, SCAN_RADIUS);
    if (nearby.length === 0) return [];
    
    // Import dependencies once
    const [
      { inventorySystem },
      { contractManager },
      { profileResolver }
    ] = await Promise.all([
      import('../systems/InventorySystem'),
      import('../systems/ContractManager'),
      import('../resolvers/ProfileResolver')
    ]);

    // 1. Pre-calculate priorities and sort
    const contractsWithPriority = nearby.map(c => ({
      contract: c,
      priority: calculatePlexityPriority(c)
    }));
    
    contractsWithPriority.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.contract.id.localeCompare(b.contract.id);
    });

    // 2. Determine fuel availability
    const availableFuel = await inventorySystem.getItemCount(playerId, FUEL_ITEM_ID);
    const fuelToConsume = Math.min(availableFuel, contractsWithPriority.length);
    
    if (fuelToConsume > 0) {
      await inventorySystem.consumeItem(playerId, FUEL_ITEM_ID, fuelToConsume);
    }

    // 3. Process boosts and NPCs in parallel for fueled contracts
    const boostPromises: Promise<void>[] = [];
    const results: ScheduleResult[] = new Array(contractsWithPriority.length);

    for (let i = 0; i < contractsWithPriority.length; i++) {
      const { contract, priority } = contractsWithPriority[i];
      const wasFueled = i < fuelToConsume;
      const boostFactor = wasFueled ? priority * 1.5 : priority;

      results[i] = {
        contractId: contract.id,
        boostFactor,
        priority,
        wasFueled
      };

      if (wasFueled) {
        boostPromises.push(contractManager.applyConstructionBoost(contract.id, boostFactor));
        boostPromises.push(profileResolver.dispatchBuilderNPCs(playerId, contract.id, contract.position));
      }
    }

    if (boostPromises.length > 0) {
      await Promise.all(boostPromises);
    }
    
    return results;
  }

  public static async claimContract(playerId: string, contract: Contract): Promise<ScheduleResult> {
    const hasFuel = await hasWarfrontCore(playerId);
    const priority = calculatePlexityPriority(contract);
    const boostFactor = hasFuel ? priority * 1.5 : priority;
    
    if (hasFuel) {
      const [
        { profileResolver },
        { contractManager }
      ] = await Promise.all([
        import('../resolvers/ProfileResolver'),
        import('../systems/ContractManager')
      ]);

      await consumeWarfrontCore(playerId);
      await Promise.all([
        contractManager.applyConstructionBoost(contract.id, boostFactor),
        profileResolver.dispatchBuilderNPCs(playerId, contract.id, contract.position)
      ]);
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
