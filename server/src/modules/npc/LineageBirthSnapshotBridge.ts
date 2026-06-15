import type { HouseState, NPCState, SettlementState } from './FamilyHouseRegistry.js';
import type { LineageBirthIntegrationResult } from './LineageBirthTickIntegration.js';
import { createNpcLineageRuntime, type NpcLineageRuntime } from './createNpcLineageRuntime.js';
import { runLineageBirthTick } from './LineageBirthTickIntegration.js';

export interface LineageRuntimeStateSnapshot {
  readonly tick: number;
  readonly settlements: readonly SettlementState[];
  readonly houses: readonly HouseState[];
  readonly npcs: readonly NPCState[];
  readonly maxSelectionsPerSettlement?: number;
}

export interface LineageRuntimeStateProvider {
  getLineageRuntimeState(playerId: string, logicalIndex: number): LineageRuntimeStateSnapshot | null | Promise<LineageRuntimeStateSnapshot | null>;
}

export interface LineageBirthSnapshotBridgeInput {
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly provider?: LineageRuntimeStateProvider;
  readonly runtime?: NpcLineageRuntime;
}

export interface LineageBirthSnapshotBridgeResult {
  readonly tick: number;
  readonly triggered: boolean;
  readonly reason: 'no_runtime_provider' | 'no_runtime_state' | 'ran';
  readonly birthsCreated: number;
  readonly birthsSkipped: number;
  readonly result?: LineageBirthIntegrationResult;
}

function normalizeTick(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function seedHouseSnapshots(runtime: NpcLineageRuntime, houses: readonly HouseState[]): void {
  for (const house of [...houses].sort((a, b) => a.id.localeCompare(b.id))) {
    runtime.registry.registerHouse(house);
  }
}

export async function runLineageBirthForSnapshot(
  input: LineageBirthSnapshotBridgeInput
): Promise<LineageBirthSnapshotBridgeResult> {
  const tick = normalizeTick(input.logicalIndex);
  if (!input.provider) {
    return Object.freeze({ tick, triggered: false, reason: 'no_runtime_provider', birthsCreated: 0, birthsSkipped: 0 });
  }

  const runtimeState = await input.provider.getLineageRuntimeState(input.playerId, tick);
  if (!runtimeState) {
    return Object.freeze({ tick, triggered: false, reason: 'no_runtime_state', birthsCreated: 0, birthsSkipped: 0 });
  }

  const runtime = input.runtime ?? createNpcLineageRuntime();
  seedHouseSnapshots(runtime, runtimeState.houses);

  const result = runLineageBirthTick({
    tick,
    settlements: runtimeState.settlements,
    houses: runtimeState.houses,
    npcs: runtimeState.npcs,
    lineageManager: runtime.manager,
    maxSelectionsPerSettlement: runtimeState.maxSelectionsPerSettlement,
  });

  return Object.freeze({
    tick,
    triggered: true,
    reason: 'ran',
    birthsCreated: result.lineageResult.created.length,
    birthsSkipped: result.lineageResult.skipped.length,
    result,
  });
}
