import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { GovernanceAction, GovernanceActionContext, GovernanceActionResult, GovernanceState, ConflictPressureOutput } from "./GovernanceTypes.js";
import { TerritoryRegistry } from "./TerritoryRegistry.js";

function hashHex(parts: readonly unknown[]): string {
  return stableHash32(parts.map((part) => String(part)).join("|")).toString(16).padStart(8, "0");
}

function orderedFlags(flags: Readonly<Record<string, boolean>>): Record<string, boolean> {
  return Object.fromEntries(Object.entries(flags).sort(([a], [b]) => a.localeCompare(b)));
}

export interface PressureAdapterInput {
  readonly territoryId: string;
  readonly tick: number;
  readonly state: GovernanceState;
}

export interface PressureAdapterOutput {
  readonly economyPressurePerMille?: number;
  readonly resourcePressurePerMille?: number;
}

export type GovernancePressureAdapter = (input: PressureAdapterInput) => PressureAdapterOutput;

export class GovernanceService {
  private readonly states = new Map<string, GovernanceState>();

  constructor(
    private readonly registry: TerritoryRegistry = new TerritoryRegistry(),
    private readonly pressureAdapter?: GovernancePressureAdapter,
  ) {
    for (const territory of registry.getTerritories()) {
      const lawFlags = Object.fromEntries(registry.getLaws().map((law) => [law.lawFlag, law.defaultEnabled]));
      for (const lawFlag of territory.defaultLawFlags) lawFlags[lawFlag] = true;
      this.states.set(territory.territoryId, Object.freeze({
        territoryId: territory.territoryId,
        taxRatePerMille: territory.defaultTaxRatePerMille,
        lawFlags: Object.freeze(orderedFlags(lawFlags)),
        resourceBudget: territory.defaultBudgets.resourceBudget,
        guardBudget: territory.defaultBudgets.guardBudget,
        militiaPool: territory.defaultBudgets.militiaPool,
        conflictState: territory.defaultConflictState,
        version: 0,
        lastActionTick: 0,
      }));
    }
  }

  getRegistry(): TerritoryRegistry { return this.registry; }

  getState(territoryId: string): GovernanceState | undefined { return this.states.get(territoryId); }

  getStates(): readonly GovernanceState[] {
    return Object.freeze([...this.states.values()].sort((a, b) => a.territoryId.localeCompare(b.territoryId)));
  }

  stateHash(): string {
    return hashHex(this.getStates().flatMap((state) => [state.territoryId, state.taxRatePerMille, JSON.stringify(orderedFlags(state.lawFlags)), state.resourceBudget, state.guardBudget, state.militiaPool, state.conflictState, state.version, state.lastActionTick]));
  }

  applyAction(action: GovernanceAction, context: GovernanceActionContext): GovernanceActionResult {
    if (!Number.isSafeInteger(context.tick) || context.tick < 0) return { ok: false, reason: "invalid_tick", stateHash: this.stateHash() };
    if (!context.actor.actorId || !context.actor.role) return { ok: false, reason: "invalid_actor", stateHash: this.stateHash() };
    const current = this.states.get(action.territoryId);
    if (!current || !this.registry.getTerritory(action.territoryId)) return { ok: false, reason: "unknown_territory", stateHash: this.stateHash() };
    if (!this.canMutate(context.actor.role, context.actor.territoryIds, action.territoryId)) return { ok: false, reason: "forbidden_actor", territoryId: action.territoryId, stateHash: this.stateHash() };

    let patch: Partial<GovernanceState> | null = null;
    if (action.type === "setTaxRate") {
      if (!Number.isSafeInteger(action.taxRatePerMille) || action.taxRatePerMille < 0 || action.taxRatePerMille > 1000) return { ok: false, reason: "invalid_tax_rate", territoryId: action.territoryId, stateHash: this.stateHash() };
      patch = { taxRatePerMille: action.taxRatePerMille };
    } else if (action.type === "setLawFlag") {
      if (!this.registry.hasLaw(action.lawFlag)) return { ok: false, reason: "unknown_law", territoryId: action.territoryId, stateHash: this.stateHash() };
      patch = { lawFlags: Object.freeze({ ...orderedFlags(current.lawFlags), [action.lawFlag]: action.enabled }) };
    } else if (action.type === "assignGuardBudget") {
      if (![action.resourceBudget, action.guardBudget, action.militiaPool].every((value) => Number.isSafeInteger(value) && value >= 0)) return { ok: false, reason: "invalid_budget", territoryId: action.territoryId, stateHash: this.stateHash() };
      patch = { resourceBudget: action.resourceBudget, guardBudget: action.guardBudget, militiaPool: action.militiaPool };
    } else if (action.type === "declareConflictState") {
      if (!["peace", "tension", "open_conflict"].includes(action.conflictState)) return { ok: false, reason: "invalid_conflict_state", territoryId: action.territoryId, stateHash: this.stateHash() };
      patch = { conflictState: action.conflictState };
    }

    if (!patch) return { ok: false, reason: "invalid_conflict_state", territoryId: action.territoryId, stateHash: this.stateHash() };
    const next = Object.freeze({ ...current, ...patch, version: current.version + 1, lastActionTick: context.tick });
    this.states.set(action.territoryId, next);
    return { ok: true, reason: "applied", territoryId: action.territoryId, version: next.version, stateHash: this.stateHash() };
  }

  calculateConflictPressure(territoryId: string, tick: number): ConflictPressureOutput {
    const state = this.states.get(territoryId);
    if (!state) throw new Error(`[GovernanceService] unknown territory ${territoryId}`);
    const adapter = this.pressureAdapter?.({ territoryId, tick: Number.isSafeInteger(tick) && tick >= 0 ? tick : 0, state }) ?? {};
    const economyPressurePerMille = this.clamp(adapter.economyPressurePerMille ?? state.taxRatePerMille);
    const resourcePressurePerMille = this.clamp(adapter.resourcePressurePerMille ?? Math.max(0, state.militiaPool - state.resourceBudget));
    const guardPressurePerMille = this.clamp(state.guardBudget === 0 ? 1000 : Math.max(0, 1000 - state.guardBudget));
    const base = state.conflictState === "peace" ? 0 : state.conflictState === "tension" ? 500 : 1000;
    const pressurePerMille = this.clamp(Math.floor((base + economyPressurePerMille + resourcePressurePerMille + guardPressurePerMille) / 4));
    return Object.freeze({ territoryId, conflictState: state.conflictState, pressurePerMille, economyPressurePerMille, resourcePressurePerMille, guardPressurePerMille, stateHash: hashHex([territoryId, tick, state.version, state.conflictState, pressurePerMille]) });
  }

  private canMutate(role: string, territoryIds: readonly string[] | undefined, territoryId: string): boolean {
    return role === "server" || ((role === "king" || role === "steward" || role === "guild_master") && !!territoryIds?.includes(territoryId));
  }

  private clamp(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.floor(value))) : 0;
  }
}
