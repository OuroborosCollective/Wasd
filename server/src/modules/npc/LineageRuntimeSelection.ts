/**
 * LineageRuntimeSelection.ts
 *
 * Pure function that transforms runtime state into lineage selection candidates.
 *
 * ARE Rules:
 * - No Math.random() - deterministic sorting only
 * - No Date.now() - uses tick from input
 * - No mutation of input state
 * - No side effects (no writes, no registry mutations)
 */

import type { HouseState, NPCState, SettlementState } from './FamilyHouseRegistry.js';
import type {
  LineageSelection,
  LineageSelectableActor,
  LineageSelectableHouse,
  LineageSelectableSettlement,
} from './LineageSelectionPure.js';
import { selectLineageInputs } from './LineageSelectionPure.js';

/**
 * Runtime state source for lineage selection.
 * All IDs must be deterministic strings.
 */
export interface RuntimeLineageState {
  readonly tick: number;
  readonly settlements: readonly SettlementState[];
  readonly houses: readonly HouseState[];
  readonly npcs: readonly NPCState[];
  readonly maxSelectionsPerSettlement?: number;
}

/**
 * Result of attempting to resolve a selection to runtime objects.
 * Used by adapter to determine if a selection can become a tick candidate.
 */
export interface SelectionResolution {
  readonly selection: LineageSelection;
  readonly resolved: boolean;
  readonly firstActor: NPCState | undefined;
  readonly secondActor: NPCState | undefined;
  readonly house: HouseState | undefined;
  readonly settlement: SettlementState | undefined;
  readonly reason?: string;
}

/**
 * Deterministic key for a selection, used for idempotency checks.
 * Format: tick:settlementId:houseId:firstActorId:secondActorId
 */
export function selectionKey(selection: LineageSelection): string {
  const firstId = selection.firstActorId < selection.secondActorId
    ? selection.firstActorId
    : selection.secondActorId;
  const secondId = selection.firstActorId < selection.secondActorId
    ? selection.secondActorId
    : selection.firstActorId;
  return [selection.tick, selection.settlementId, selection.houseId, firstId, secondId].join(':');
}

/**
 * Converts runtime state to lineage-selectable types.
 * Pure function - no side effects.
 */
function toSelectableSettlements(settlements: readonly SettlementState[]): LineageSelectableSettlement[] {
  return settlements
    .filter((s) => s.population < s.capacity && s.foodSupply >= 0)
    .map((s) => ({
      id: s.id,
      tick: s.tick,
      population: s.population,
      capacity: s.capacity,
      foodSupply: s.foodSupply,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Converts runtime houses to lineage-selectable types.
 * Only active houses are selectable.
 * Pure function - no side effects.
 */
function toSelectableHouses(houses: readonly HouseState[]): LineageSelectableHouse[] {
  return houses
    .filter((h) => h.isActive)
    .map((h) => ({
      id: h.id,
      settlementId: h.settlementId,
      isActive: h.isActive,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Converts runtime NPCs to lineage-selectable actors.
 * NPCs must have settlementId and houseId to be selectable.
 * Pure function - no side effects.
 */
function toSelectableActors(npcs: readonly NPCState[]): LineageSelectableActor[] {
  return npcs
    .filter((n) => n.settlementId && n.houseId)
    .map((n) => ({
      id: n.id,
      settlementId: n.settlementId!,
      houseId: n.houseId!,
    }))
    .sort((a, b) => {
      const keyA = `${a.settlementId}:${a.houseId}:${a.id}`;
      const keyB = `${b.settlementId}:${b.houseId}:${b.id}`;
      return keyA.localeCompare(keyB);
    });
}

/**
 * Creates a lookup map from NPC ID to NPCState.
 * Pure function - no side effects.
 */
export function createNpcLookup(npcs: readonly NPCState[]): Map<string, NPCState> {
  const map = new Map<string, NPCState>();
  for (const npc of npcs) {
    map.set(npc.id, npc);
  }
  return map;
}

/**
 * Creates a lookup map from settlement ID to SettlementState.
 * Pure function - no side effects.
 */
export function createSettlementLookup(settlements: readonly SettlementState[]): Map<string, SettlementState> {
  const map = new Map<string, SettlementState>();
  for (const settlement of settlements) {
    map.set(settlement.id, settlement);
  }
  return map;
}

/**
 * Creates a lookup map from house ID to HouseState.
 * Pure function - no side effects.
 */
export function createHouseLookup(houses: readonly HouseState[]): Map<string, HouseState> {
  const map = new Map<string, HouseState>();
  for (const house of houses) {
    map.set(house.id, house);
  }
  return map;
}

/**
 * Main selection function: RuntimeLineageState → LineageSelection[]
 *
 * This is a pure function that:
 * - Reads runtime state
 * - Computes deterministic selections
 * - Does NOT write to any store or registry
 *
 * Rules enforced:
 * - Full settlements produce no selections
 * - Inactive houses produce no selections
 * - NPCs without matching settlement are excluded
 * - All outputs are deterministically sorted by ID
 */
export function selectFromRuntime(state: RuntimeLineageState): LineageSelection[] {
  const settlements = toSelectableSettlements(state.settlements);
  const houses = toSelectableHouses(state.houses);
  const actors = toSelectableActors(state.npcs);

  const input = {
    tick: state.tick,
    settlements,
    houses,
    actors,
    maxSelectionsPerSettlement: state.maxSelectionsPerSettlement,
  };

  return selectLineageInputs(input);
}

/**
 * Resolves selections to runtime objects.
 * Returns a deterministic result even when some lookups fail.
 * Pure function - no side effects.
 */
export function resolveSelections(
  selections: readonly LineageSelection[],
  npcsById: Map<string, NPCState>,
  settlementsById: Map<string, SettlementState>,
  housesById: Map<string, HouseState>
): SelectionResolution[] {
  return selections.map((selection) => {
    const firstActor = npcsById.get(selection.firstActorId);
    const secondActor = npcsById.get(selection.secondActorId);
    const house = housesById.get(selection.houseId);
    const settlement = settlementsById.get(selection.settlementId);

    let resolved = true;
    let reason: string | undefined;

    if (!firstActor) {
      resolved = false;
      reason = 'first_actor_not_found';
    } else if (!secondActor) {
      resolved = false;
      reason = 'second_actor_not_found';
    } else if (!house) {
      resolved = false;
      reason = 'house_not_found';
    } else if (!settlement) {
      resolved = false;
      reason = 'settlement_not_found';
    } else if (!house.isActive) {
      resolved = false;
      reason = 'house_inactive';
    } else if (settlement.population >= settlement.capacity) {
      resolved = false;
      reason = 'settlement_full';
    }

    return Object.freeze({
      selection,
      resolved,
      firstActor,
      secondActor,
      house,
      settlement,
      reason,
    });
  });
}
