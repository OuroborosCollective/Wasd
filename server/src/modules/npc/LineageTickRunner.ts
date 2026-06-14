import { NPCLineageManager, type LineageNode, type NPCState, type SettlementState } from './FamilyHouseRegistry';

export interface LineageTickCandidate {
  readonly parentA: NPCState;
  readonly parentB: NPCState;
  readonly houseId: string;
  readonly settlement: SettlementState;
  readonly tick?: number;
}

export interface LineageTickSkip {
  readonly parentAId: string;
  readonly parentBId: string;
  readonly houseId: string;
  readonly settlementId: string;
  readonly tick: number;
  readonly reason: string;
}

export interface LineageTickResult {
  readonly tick: number;
  readonly created: readonly LineageNode[];
  readonly skipped: readonly LineageTickSkip[];
}

function candidateKey(candidate: LineageTickCandidate, tick: number): string {
  const [firstParentId, secondParentId] = [candidate.parentA.id, candidate.parentB.id].sort();
  return [tick, candidate.settlement.id, candidate.houseId, firstParentId, secondParentId].join(':');
}

function reasonFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'npc_lineage_tick_unknown_skip';
}

export class LineageTickRunner {
  constructor(private readonly lineageManager: NPCLineageManager) {}

  run(tick: number, candidates: readonly LineageTickCandidate[]): LineageTickResult {
    const created: LineageNode[] = [];
    const skipped: LineageTickSkip[] = [];
    const ordered = [...candidates].sort((a, b) => candidateKey(a, a.tick ?? tick).localeCompare(candidateKey(b, b.tick ?? tick)));

    for (const candidate of ordered) {
      const birthTick = candidate.tick ?? tick;
      const settlement = { ...candidate.settlement, tick: birthTick };
      try {
        created.push(this.lineageManager.createDescendant(candidate.parentA, candidate.parentB, candidate.houseId, settlement, birthTick));
      } catch (error) {
        skipped.push(Object.freeze({
          parentAId: candidate.parentA.id,
          parentBId: candidate.parentB.id,
          houseId: candidate.houseId,
          settlementId: settlement.id,
          tick: birthTick,
          reason: reasonFrom(error),
        }));
      }
    }

    return Object.freeze({ tick, created: Object.freeze(created), skipped: Object.freeze(skipped) });
  }
}
