import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConstructionScheduler, Contract, ContractType } from '../modules/gameplay/ConstructionScheduler';
import { inventorySystem } from '../modules/systems/InventorySystem';
import { contractManager } from '../modules/systems/ContractManager';
import { profileResolver } from '../modules/resolvers/ProfileResolver';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

vi.mock('../modules/systems/InventorySystem', () => ({
  inventorySystem: {
    hasItem: vi.fn(),
    consumeItem: vi.fn(),
    getItemCount: vi.fn(),
  }
}));

vi.mock('../modules/systems/ContractManager', () => ({
  contractManager: {
    applyConstructionBoost: vi.fn(),
  }
}));

vi.mock('../modules/resolvers/ProfileResolver', () => ({
  profileResolver: {
    dispatchBuilderNPCs: vi.fn(),
  }
}));

describe('ConstructionScheduler Performance', () => {
  const playerId = 'test-player';
  const position = { x: 0, y: 0, z: 0 };
  const numContracts = 100;
  const contracts: Contract[] = Array.from({ length: numContracts }, (_, i) => ({
    id: `contract-${i}`,
    type: ContractType.STRUCTURAL,
    hp: 100,
    maxHp: 100,
    resonance: 1,
    position: { x: 1, y: 1, z: 0 },
    priority: 1
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    (contractManager.applyConstructionBoost as any).mockImplementation(async () => {
        await sleep(1);
    });
    (profileResolver.dispatchBuilderNPCs as any).mockImplementation(async () => {
        await sleep(1);
    });
  });

  it('measures optimizeContracts performance', async () => {
    let fuelCount = 50;
    (inventorySystem.getItemCount as any).mockImplementation(async () => {
      await sleep(1);
      return fuelCount;
    });
    (inventorySystem.consumeItem as any).mockImplementation(async (_p: string, _i: string, amount: number) => {
      await sleep(1);
      fuelCount -= amount;
      return true;
    });

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      fuelCount = 50;
      await ConstructionScheduler.optimizeContracts(playerId, position, contracts);
    }
    const end = performance.now();
    console.log(`Average time for optimizeContracts (${numContracts} contracts): ${(end - start) / iterations}ms`);
  });

  it('verifies correct fueling logic', async () => {
    (inventorySystem.getItemCount as any).mockImplementation(async () => 10);
    (inventorySystem.consumeItem as any).mockImplementation(async () => true);

    const results = await ConstructionScheduler.optimizeContracts(playerId, position, contracts);

    expect(results.filter(r => r.wasFueled).length).toBe(10);
    expect(inventorySystem.consumeItem).toHaveBeenCalledWith(playerId, 'warfront_core', 10);
    expect(contractManager.applyConstructionBoost).toHaveBeenCalledTimes(10);
    expect(profileResolver.dispatchBuilderNPCs).toHaveBeenCalledTimes(10);
  });
});
