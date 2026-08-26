import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type {
  ConflictPressureOutput,
  GovernanceAction,
  GovernanceActionContext,
  GovernanceActionResult,
  GovernanceState,
} from "./GovernanceTypes.js";
import { TerritoryRegistry } from "./TerritoryRegistry.js";

interface ActionPatchResult {
  readonly ok: true;
  readonly patch: Partial<GovernanceState>;
}

function hashHex(parts: readonly unknown[]): string {
  const seed = parts.map((part) => String(part)).join("|");
  return stableHash32(seed).toString(16).padStart(8, "0");
}

function orderedFlags(flags: Readonly<Record<string, boolean>>): Record<string, boolean> {
  const entries = Object.entries(flags).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function isPatchResult(result: GovernanceActionResult | ActionPatchResult): result is ActionPatchResult {
  return result.ok === true && "patch" in result;
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
      const lawFlags: Record<string, boolean> = Object.fromEntries(
        registry.getLaws().map((law) => [law.lawFlag, law.defaultEnabled]),
      );
      for (const lawFlag of territory.defaultLawFlags) lawFlags[lawFlag] = true;

      this.states.set(
        territory.territoryId,
        Object.freeze({
          territoryId: territory.territoryId,
          taxRatePerMille: territory.defaultTaxRatePerMille,
          lawFlags: Object.freeze(orderedFlags(lawFlags)),
          resourceBudget: territory.defaultBudgets.resourceBudget,
          guardBudget: territory.defaultBudgets.guardBudget,
          militiaPool: territory.defaultBudgets.militiaPool,
          conflictState: territory.defaultConflictState,
          version: 0,
          lastActionTick: 0,
        }),
      );
    }
  }

  getRegistry(): TerritoryRegistry {
    return this.registry;
  }

  getState(territoryId: string): GovernanceState | undefined {
    return this.states.get(territoryId);
  }

  getStates(): readonly GovernanceState[] {
    const states = [...this.states.values()].sort((a, b) => (
      a.territoryId.localeCompare(b.territoryId)
    ));
    return Object.freeze(states);
  }

  stateHash(): string {
    return hashHex(
      this.getStates().flatMap((state) => [
        state.territoryId,
        state.taxRatePerMille,
        JSON.stringify(orderedFlags(state.lawFlags)),
        state.resourceBudget,
        state.guardBudget,
        state.militiaPool,
        state.conflictState,
        state.version,
        state.lastActionTick,
      ]),
    );
  }

  applyAction(action: GovernanceAction, context: GovernanceActionContext): GovernanceActionResult {
    const stateHash = this.stateHash();
    if (!Number.isSafeInteger(context.tick) || context.tick < 0) {
      return { ok: false, reason: "invalid_tick", stateHash };
    }
    if (!context.actor.actorId || !context.actor.role) {
      return { ok: false, reason: "invalid_actor", stateHash };
    }

    const current = this.states.get(action.territoryId);
    if (!current || !this.registry.getTerritory(action.territoryId)) {
      return { ok: false, reason: "unknown_territory", stateHash };
    }
    if (!this.canMutate(context.actor.role, context.actor.territoryIds, action.territoryId)) {
      return {
        ok: false,
        reason: "forbidden_actor",
        territoryId: action.territoryId,
        stateHash,
      };
    }

    const patchResult = this.createActionPatch(action, current, stateHash);
    if (!isPatchResult(patchResult)) return patchResult;

    const next = Object.freeze({
      ...current,
      ...patchResult.patch,
      version: current.version + 1,
      lastActionTick: context.tick,
    });
    this.states.set(action.territoryId, next);

    return {
      ok: true,
      reason: "applied",
      territoryId: action.territoryId,
      version: next.version,
      stateHash: this.stateHash(),
    };
  }

  calculateConflictPressure(territoryId: string, tick: number): ConflictPressureOutput {
    const state = this.states.get(territoryId);
    if (!state) throw new Error(`[GovernanceService] unknown territory ${territoryId}`);

    const safeTick = Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
    const adapter = this.pressureAdapter?.({ territoryId, tick: safeTick, state }) ?? {};
    const economyPressurePerMille = this.clamp(
      adapter.economyPressurePerMille ?? state.taxRatePerMille,
    );
    const resourcePressurePerMille = this.clamp(
      adapter.resourcePressurePerMille ?? Math.max(0, state.militiaPool - state.resourceBudget),
    );
    const guardPressurePerMille = this.clamp(
      state.guardBudget === 0 ? 1000 : Math.max(0, 1000 - state.guardBudget),
    );
    const conflictBase = this.conflictBasePressure(state.conflictState);
    const pressurePerMille = this.clamp(
      Math.floor((
        conflictBase
        + economyPressurePerMille
        + resourcePressurePerMille
        + guardPressurePerMille
      ) / 4),
    );

    return Object.freeze({
      territoryId,
      conflictState: state.conflictState,
      pressurePerMille,
      economyPressurePerMille,
      resourcePressurePerMille,
      guardPressurePerMille,
      stateHash: hashHex([
        territoryId,
        safeTick,
        state.version,
        state.conflictState,
        pressurePerMille,
      ]),
    });
  }

  private createActionPatch(
    action: GovernanceAction,
    current: GovernanceState,
    stateHash: string,
  ): GovernanceActionResult | ActionPatchResult {
    if (action.type === "setTaxRate") {
      const invalidTaxRate =
        !Number.isSafeInteger(action.taxRatePerMille) ||
        action.taxRatePerMille < 0 ||
        action.taxRatePerMille > 1000;
      if (invalidTaxRate) {
        return {
          ok: false,
          reason: "invalid_tax_rate",
          territoryId: action.territoryId,
          stateHash,
        };
      }
      return { ok: true, patch: { taxRatePerMille: action.taxRatePerMille } };
    }

    if (action.type === "setLawFlag") {
      if (!this.registry.hasLaw(action.lawFlag)) {
        return {
          ok: false,
          reason: "unknown_law",
          territoryId: action.territoryId,
          stateHash,
        };
      }
      return {
        ok: true,
        patch: {
          lawFlags: Object.freeze({
            ...orderedFlags(current.lawFlags),
            [action.lawFlag]: action.enabled,
          }),
        },
      };
    }

    if (action.type === "assignGuardBudget") {
      const budgets = [action.resourceBudget, action.guardBudget, action.militiaPool];
      if (!budgets.every((value) => Number.isSafeInteger(value) && value >= 0)) {
        return {
          ok: false,
          reason: "invalid_budget",
          territoryId: action.territoryId,
          stateHash,
        };
      }
      return {
        ok: true,
        patch: {
          resourceBudget: action.resourceBudget,
          guardBudget: action.guardBudget,
          militiaPool: action.militiaPool,
        },
      };
    }

    if (action.type === "declareConflictState") {
      if (!["peace", "tension", "open_conflict"].includes(action.conflictState)) {
        return {
          ok: false,
          reason: "invalid_conflict_state",
          territoryId: action.territoryId,
          stateHash,
        };
      }
      return { ok: true, patch: { conflictState: action.conflictState } };
    }

    return {
      ok: false,
      reason: "invalid_conflict_state",
      stateHash,
    };
  }

  private conflictBasePressure(conflictState: GovernanceState["conflictState"]): number {
    if (conflictState === "peace") return 0;
    if (conflictState === "tension") return 500;
    return 1000;
  }

  private canMutate(
    role: string,
    territoryIds: readonly string[] | undefined,
    territoryId: string,
  ): boolean {
    const privilegedRole = role === "king" || role === "steward" || role === "guild_master";
    return role === "server" || (privilegedRole && !!territoryIds?.includes(territoryId));
  }

  private clamp(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.floor(value))) : 0;
  }
}
