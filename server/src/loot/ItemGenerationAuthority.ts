'use strict';

import { ProceduralLootMachine } from './ProceduralLootMachine.js';

export const ITEM_GENERATION_AUTHORITY_ID = 'procedural-loot-machine.v1' as const;

export interface ItemGenerationAuthorityDeps {
  readonly db: any;
  readonly policy?: Record<string, unknown>;
}

export interface ItemGenerationRequest {
  readonly playerId: string;
  readonly tickIndex: number;
  readonly dropSourceId: string;
  readonly lootIndex?: number;
  readonly areaLevel: number;
  readonly policyVersion?: string;
  readonly treasureClassId?: string;
  readonly magicFind?: number;
  readonly killStreak?: number;
  readonly sourceRank?: string;
  readonly biomeId?: string;
  readonly factionId?: string;
  readonly socialString?: string;
  readonly playerReputation?: number;
}

export interface ItemGenerationResult {
  readonly authorityId: typeof ITEM_GENERATION_AUTHORITY_ID;
  readonly seedHash: string;
  readonly context: unknown;
  readonly items: readonly unknown[];
}

export class ItemGenerationAuthority {
  private readonly machine: ProceduralLootMachine;

  public constructor(deps: ItemGenerationAuthorityDeps) {
    this.machine = new ProceduralLootMachine(deps.db, deps.policy ?? {});
  }

  public async generate(request: ItemGenerationRequest): Promise<ItemGenerationResult> {
    const result = await this.machine.generate(request);
    return Object.freeze({
      authorityId: ITEM_GENERATION_AUTHORITY_ID,
      seedHash: result.seedHash,
      context: result.context,
      items: result.items,
    });
  }
}

export function createItemGenerationAuthority(deps: ItemGenerationAuthorityDeps): ItemGenerationAuthority {
  return new ItemGenerationAuthority(deps);
}
