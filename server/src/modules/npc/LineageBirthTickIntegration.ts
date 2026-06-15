/**
 * LineageBirthTickIntegration.ts
 *
 * Orchestrates the full lineage birth pipeline:
 * 1. Pure selection from runtime state
 * 2. Selection-to-tick candidate adaptation
 * 3. LineageTickRunner execution
 * 4. Journal write via NPCLineageManager
 * 5. Surface model reconstruction
 *
 * ARE Rules:
 * - No Math.random() - deterministic only
 * - No Date.now() - uses tick from runtime state
 * - No mutation of runtime state
 * - Journal-first: failure to write = failure of the operation
 */

import type { HouseState, NPCState, SettlementState } from './FamilyHouseRegistry';
import type { LineageSurfaceModel } from './LineageSurfaceModel';
import type { LiveGameplayWorldSurface } from '../../gameplay/LiveGameplaySnapshotTypes.js';
import { createLineageSurfaceModel } from './LineageSurfaceModel.js';
import { lineageSurfaceToWorldSurface } from './LineageWorldSurfaceAdapter.js';
import { LineageTickRunner } from './LineageTickRunner.js';
import type { NPCLineageManager } from './FamilyHouseRegistry.js';
import {
  selectFromRuntime,
  createNpcLookup,
  createSettlementLookup,
  createHouseLookup,
  type RuntimeLineageState,
} from './LineageRuntimeSelection.js';
import {
  adaptSelectionsToCandidates,
  type LineageTickAdapterInput,
} from './LineageRuntimeTickAdapter.js';

/**
 * Result of a complete lineage birth tick operation.
 */
export interface LineageBirthTickResult {
  readonly tick: number;
  readonly selections: number;
  readonly candidatesProcessed: number;
  readonly birthsCreated: number;
  readonly birthsSkipped: number;
  readonly journalWrites: number;
  readonly surfaceTick: number;
  readonly errors: readonly string[];
}

/**
 * Result of the full integration operation.
 */
export interface LineageBirthIntegrationResult {
  readonly tick: number;
  readonly lineageResult: import('./LineageTickRunner.js').LineageTickResult;
  readonly surface: LiveGameplayWorldSurface;
  readonly errors: readonly string[];
}

/**
 * Input for lineage birth integration.
 */
export interface LineageBirthIntegrationInput {
  readonly tick: number;
  readonly settlements: readonly SettlementState[];
  readonly houses: readonly HouseState[];
  readonly npcs: readonly NPCState[];
  readonly lineageManager: NPCLineageManager;
  readonly maxSelectionsPerSettlement?: number;
}

/**
 * Builds a RuntimeLineageState from raw runtime inputs.
 */
function buildRuntimeState(input: LineageBirthIntegrationInput): RuntimeLineageState {
  return {
    tick: input.tick,
    settlements: input.settlements,
    houses: input.houses,
    npcs: input.npcs,
    maxSelectionsPerSettlement: input.maxSelectionsPerSettlement,
  };
}

/**
 * Creates lookup maps for runtime objects.
 */
function buildLookups(input: LineageBirthIntegrationInput) {
  return {
    npcsById: createNpcLookup(input.npcs),
    settlementsById: createSettlementLookup(input.settlements),
    housesById: createHouseLookup(input.houses),
  };
}

/**
 * Runs a single lineage birth tick:
 * 1. Select eligible pairs from runtime state (pure)
 * 2. Adapt selections to tick candidates (thin adapter)
 * 3. Execute tick via LineageTickRunner (creates births in journal)
 * 4. Rebuild surface model from updated registry
 *
 * Returns a deterministic result even on partial failure.
 */
export function runLineageBirthTick(input: LineageBirthIntegrationInput): LineageBirthIntegrationResult {
  const errors: string[] = [];
  const lookups = buildLookups(input);

  // Phase 1: Pure selection from runtime state
  const runtimeState = buildRuntimeState(input);
  const selections = selectFromRuntime(runtimeState);

  if (selections.length === 0) {
    // No selections possible - return early with empty surface
    const registry = input.lineageManager.getRegistry();
    const surfaceModel = createLineageSurfaceModel(registry, input.tick);
    const surface = lineageSurfaceToWorldSurface(surfaceModel);
    return Object.freeze({
      tick: input.tick,
      lineageResult: Object.freeze({
        tick: input.tick,
        created: [],
        skipped: [],
      }),
      surface,
      errors: Object.freeze([]),
    });
  }

  // Phase 2: Adapt selections to tick candidates
  const adapterInput: LineageTickAdapterInput = {
    selections,
    npcsById: lookups.npcsById,
    settlementsById: lookups.settlementsById,
    housesById: lookups.housesById,
    tick: input.tick,
  };
  const { candidates } = adaptSelectionsToCandidates(adapterInput);

  if (candidates.length === 0) {
    // No resolvable candidates
    const registry = input.lineageManager.getRegistry();
    const surfaceModel = createLineageSurfaceModel(registry, input.tick);
    const surface = lineageSurfaceToWorldSurface(surfaceModel);
    return Object.freeze({
      tick: input.tick,
      lineageResult: Object.freeze({
        tick: input.tick,
        created: [],
        skipped: [],
      }),
      surface,
      errors: Object.freeze(['no_resolvable_candidates']),
    });
  }

  // Phase 3: Execute tick via LineageTickRunner
  // This creates births via NPCLineageManager, which writes to journal via sink
  const runner = new LineageTickRunner(input.lineageManager);
  const lineageResult = runner.run(input.tick, candidates);

  // Track any errors from the lineage operation
  for (const skip of lineageResult.skipped) {
    errors.push(`skip:${skip.reason}:${skip.houseId}`);
  }

  // Phase 4: Rebuild surface model from updated registry
  // The registry now contains the new births (if any)
  const registry = input.lineageManager.getRegistry();
  const surfaceModel = createLineageSurfaceModel(registry, input.tick);
  const surface = lineageSurfaceToWorldSurface(surfaceModel);

  return Object.freeze({
    tick: input.tick,
    lineageResult,
    surface,
    errors: Object.freeze(errors),
  });
}

/**
 * Runs multiple lineage birth ticks in sequence.
 * Each tick sees the state from the previous tick.
 */
export function runLineageBirthTicks(
  ticks: readonly number[],
  getStateForTick: (tick: number) => LineageBirthIntegrationInput
): LineageBirthIntegrationResult[] {
  const results: LineageBirthIntegrationResult[] = [];

  for (const tick of ticks) {
    const input = getStateForTick(tick);
    const result = runLineageBirthTick(input);
    results.push(result);
  }

  return results;
}

/**
 * Gets the current world surface from a lineage manager.
 * Pure function - reads from existing registry state.
 */
export function getCurrentWorldSurface(
  lineageManager: NPCLineageManager,
  tick: number
): LiveGameplayWorldSurface {
  const registry = lineageManager.getRegistry();
  const surfaceModel = createLineageSurfaceModel(registry, tick);
  return lineageSurfaceToWorldSurface(surfaceModel);
}

/**
 * Verifies that a surface contains the expected lineage node.
 */
export function surfaceContainsNode(
  surface: LiveGameplayWorldSurface,
  lineageId: string
): boolean {
  return surface.points.some(
    (point: unknown) =>
      typeof point === 'object' &&
      point !== null &&
      'id' in point &&
      (point as Record<string, unknown>).id === lineageId
  );
}

/**
 * Verifies that a surface contains the expected house group.
 */
export function surfaceContainsHouse(
  surface: LiveGameplayWorldSurface,
  houseId: string
): boolean {
  return surface.groups.some(
    (group: unknown) =>
      typeof group === 'object' &&
      group !== null &&
      'id' in group &&
      (group as Record<string, unknown>).id === houseId
  );
}
