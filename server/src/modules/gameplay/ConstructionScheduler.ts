// @ts-nocheck
import { contractManager } from "../systems/ContractManager";
import { inventorySystem } from "../systems/InventorySystem";
import { profileResolver } from "../resolvers/ProfileResolver";

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Contract {
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    resonance: number;
    position: Vector3;
}

export class ConstructionScheduler {
    private static readonly SCAN_RADIUS = 40;
    private static readonly FUEL_ITEM_ID = 'warfront_core';

    public async optimizeContracts(playerId: string, position: Vector3): Promise<void> {
        const nearbyContracts = contractManager.getContractsInRadius(position, ConstructionScheduler.SCAN_RADIUS);

        for (const contract of nearbyContracts) {
            const hasFuel = await inventorySystem.hasItem(playerId, ConstructionScheduler.FUEL_ITEM_ID, 1);

            if (hasFuel) {
                const weight = this.calculateComplexityWeight(contract);
                const boostFactor = weight * 1.5;

                const consumed = await inventorySystem.consumeItem(playerId, ConstructionScheduler.FUEL_ITEM_ID, 1);
                
                if (consumed) {
                    await this.onClaimContract(contract, boostFactor);
                    profileResolver.dispatchBuilderNPCs(playerId, contract.id, contract.position);
                }
            }
        }
    }

    private calculateComplexityWeight(contract: Contract): number {
        const typeWeightMap: Record<string, number> = {
            'foundation': 0.8,
            'structural': 1.2,
            'technical': 1.5,
            'fortification': 2.0
        };

        const typeWeight = typeWeightMap[contract.type] || 1.0;
        const hpRatio = contract.hp / contract.maxHp;
        const inverseResonance = contract.resonance !== 0 ? 1 / contract.resonance : 1;

        return (typeWeight * 0.45) + (hpRatio * 0.35) + (inverseResonance * 0.20);
    }

    private async onClaimContract(contract: Contract, boostFactor: number): Promise<void> {
        await contractManager.applyConstructionBoost(contract.id, boostFactor);
        console.log(`Contract ${contract.id} claimed with boost factor: ${boostFactor}`);
    }
}

export const constructionScheduler = new ConstructionScheduler();