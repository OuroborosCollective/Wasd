/**
 * LineageRuntimeTickAdapter.ts
 *
 * Thin adapter that maps LineageSelection[] to LineageTickCandidate[].
 *
 * This adapter:
 * - Resolves selection IDs to actual runtime objects
 * - Does NOT decide eligibility (that stays in NPCLineageManager/LineageTickRunner)
 * - Skips selections that cannot be resolved deterministically
 *
 * ARE Rules:
 * - No Math.random() - deterministic only
 * - No Date.now() - uses tick from input
 * - No mutation of runtime state
 * - No side effects
 */

import type { HouseState, NPCState, SettlementState } from './FamilyHouseRegistry';
import type { LineageTickCandidate, LineageTickSkip } from './LineageTickRunner';
import type { LineageSelection } from './LineageSelectionPure';
import type { SelectionResolution } from './LineageRuntimeSelection';

/**
 * Result of adaptation operation.
 * Contains either successful candidates or skipped selections with reasons.
 */
export interface LineageTickAdaptResult {
  readonly candidates: readonly LineageTickCandidate[];
  readonly skipped: readonly LineageTickSkip[];
}

/**
 * Input for the adapter, combining selections with runtime lookups.
 */
export interface LineageTickAdapterInput {
  readonly selections: readonly LineageSelection[];
  readonly npcsById: ReadonlyMap<string, NPCState>;
  readonly settlementsById: ReadonlyMap<string, SettlementState>;
  readonly housesById: ReadonlyMap<string, HouseState>;
  readonly tick: number;
  /**
   * Existing birth event keys from the journal/registry.
   * Used for idempotency: if a key is already present, skip the candidate.
   * Format: tick:settlementId:houseId:firstActorId:secondActorId (actors sorted)
   */
  readonly existingBirthKeys?: ReadonlySet<string>;
}

/**
 * Deterministic key for tick candidate/skip, used for idempotency.
 * Format: tick:settlementId:houseId:firstActorId:secondActorId
 */
export function candidateKey(
  tick: number,
  settlementId: string,
  houseId: string,
  firstActorId: string,
  secondActorId: string
): string {
  const sorted = [firstActorId, secondActorId].sort();
  return [tick, settlementId, houseId, sorted[0], sorted[1]].join(':');
}

/**
 * Converts a resolved selection to a tick candidate.
 * Returns undefined if the resolution indicates the selection cannot proceed.
 */
function toCandidate(
  resolution: SelectionResolution,
  existingKeys: ReadonlySet<string>
): LineageTickCandidate | LineageTickSkip | null {
  const { selection, resolved, firstActor, secondActor, house, settlement, reason } = resolution;

  // Check for idempotency: same tick + same actors + same house = skip
  const key = candidateKey(
    selection.tick,
    selection.settlementId,
    selection.houseId,
    selection.firstActorId,
    selection.secondActorId
  );

  if (existingKeys.has(key)) {
    return {
      parentAId: selection.firstActorId,
      parentBId: selection.secondActorId,
      houseId: selection.houseId,
      settlementId: selection.settlementId,
      tick: selection.tick,
      reason: 'idempotent_duplicate',
    };
  }

  if (!resolved || !firstActor || !secondActor || !house || !settlement) {
    return {
      parentAId: selection.firstActorId,
      parentBId: selection.secondActorId,
      houseId: selection.houseId,
      settlementId: selection.settlementId,
      tick: selection.tick,
      reason: reason ?? 'unresolved',
    };
  }

  // Adapter does not check eligibility - that is the job of LineageTickRunner
  return {
    parentA: firstActor,
    parentB: secondActor,
    houseId: house.id,
    settlement,
    tick: selection.tick,
  };
}

/**
 * Adapts lineage selections to tick candidates using runtime lookups.
 *
 * This function:
 * - Takes selections from pure selection phase
 * - Maps IDs to runtime objects using provided lookup maps
 * - Produces LineageTickCandidate[] for LineageTickRunner
 * - Records skipped selections with deterministic reasons
 *
 * The adapter does NOT:
 * - Decide if a pair is eligible
 * - Write to any store
 * - Create lineage nodes
 */
export function adaptSelectionsToCandidates(input: LineageTickAdapterInput): LineageTickAdaptResult {
  const { selections, npcsById, settlementsById, housesById, tick, existingBirthKeys } = input;

  // Use provided existing keys for idempotency, or empty set if not provided
  const processedKeys = new Set<string>(existingBirthKeys ?? []);

  const candidates: LineageTickCandidate[] = [];
  const skipped: LineageTickSkip[] = [];

  // Process selections in deterministic order (already sorted from pure selection)
  for (const selection of selections) {
    const firstActor = npcsById.get(selection.firstActorId);
    const secondActor = npcsById.get(selection.secondActorId);
    const house = housesById.get(selection.houseId);
    const settlement = settlementsById.get(selection.settlementId);

    const resolved = firstActor && secondActor && house && settlement;
    let reason: string | undefined;

    if (!firstActor) reason = 'first_actor_not_found';
    else if (!secondActor) reason = 'second_actor_not_found';
    else if (!house) reason = 'house_not_found';
    else if (!settlement) reason = 'settlement_not_found';
    else if (!house.isActive) reason = 'house_inactive';
    else if (settlement.population >= settlement.capacity) reason = 'settlement_full';

    const resolution: SelectionResolution = {
      selection,
      resolved: !!resolved,
      firstActor,
      secondActor,
      house,
      settlement,
      reason,
    };

    const result = toCandidate(resolution, processedKeys);

    if (result && 'parentA' in result) {
      candidates.push(result);
      // Track this key as processed for idempotency
      const key = candidateKey(
        selection.tick,
        selection.settlementId,
        selection.houseId,
        selection.firstActorId,
        selection.secondActorId
      );
      processedKeys.add(key);
    } else if (result && 'parentAId' in result) {
      skipped.push(result);
    }
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    skipped: Object.freeze(skipped),
  });
}

/**
 * Filters candidates to only those with unique settlement+house combinations.
 * Used when multiple candidates exist for the same settlement.
 */
export function deduplicateCandidatesBySettlement(
  candidates: readonly LineageTickCandidate[]
): LineageTickCandidate[] {
  const seen = new Set<string>();
  const result: LineageTickCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.settlement.id}:${candidate.houseId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(candidate);
    }
  }

  return result;
}
