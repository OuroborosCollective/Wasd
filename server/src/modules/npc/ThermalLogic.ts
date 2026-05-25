export type ThermalStatus = 'DECOMPOSITION' | 'CRITICAL' | 'STABLE' | 'OVERHEATED';

export type EnergyState = {
  currentEnergy: number;
  maxEnergy: number;
  decayRate: number;
  lastUpdatedTick: number;
};

export type ThermalTickResult = {
  energy: EnergyState;
  status: ThermalStatus;
  ticksPassed: number;
  totalLoss: number;
  canAct: boolean;
};

export type ThermalActionResult = {
  energy: EnergyState;
  status: ThermalStatus;
  afforded: boolean;
  appliedCost: number;
};

export type ThermalLogicOptions = {
  entropyConstant?: number;
  criticalRatio?: number;
  overheatedRatio?: number;
  overheatDecayMultiplier?: number;
};

const DEFAULT_MAX_ENERGY = 1000;
const DEFAULT_DECAY_RATE = 1;

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 0, max = DEFAULT_MAX_ENERGY): number {
  return Math.max(min, Math.min(max, value));
}

export class ThermalLogic {
  private readonly entropyConstant: number;
  private readonly criticalRatio: number;
  private readonly overheatedRatio: number;
  private readonly overheatDecayMultiplier: number;

  constructor(options: ThermalLogicOptions = {}) {
    this.entropyConstant = Math.max(0, Math.trunc(finite(options.entropyConstant, 5)));
    this.criticalRatio = Math.max(0, Math.min(1, finite(options.criticalRatio, 0.1)));
    this.overheatedRatio = Math.max(0, Math.min(1, finite(options.overheatedRatio, 0.9)));
    this.overheatDecayMultiplier = Math.max(1, finite(options.overheatDecayMultiplier, 1.5));
  }

  public normalizeState(state: Partial<EnergyState> | null | undefined, currentTick = 0): EnergyState {
    const maxEnergy = Math.max(1, Math.trunc(finite(state?.maxEnergy, DEFAULT_MAX_ENERGY)));
    return Object.freeze({
      currentEnergy: clamp(Math.trunc(finite(state?.currentEnergy, maxEnergy)), 0, maxEnergy),
      maxEnergy,
      decayRate: Math.max(0, Math.trunc(finite(state?.decayRate, DEFAULT_DECAY_RATE))),
      lastUpdatedTick: Math.max(0, Math.trunc(finite(state?.lastUpdatedTick, currentTick))),
    });
  }

  public calculateDecay(state: Partial<EnergyState> | null | undefined, currentTick: number): number {
    return this.applyDecay(state, currentTick).energy.currentEnergy;
  }

  public applyDecay(state: Partial<EnergyState> | null | undefined, currentTick: number): ThermalTickResult {
    const normalized = this.normalizeState(state, currentTick);
    const tick = Math.max(0, Math.trunc(finite(currentTick, normalized.lastUpdatedTick)));
    const ticksPassed = Math.max(0, tick - normalized.lastUpdatedTick);
    const baseLossPerTick = normalized.decayRate + this.entropyConstant;
    const multiplier = this.statusOf(normalized) === 'OVERHEATED' ? this.overheatDecayMultiplier : 1;
    const totalLoss = Math.trunc(ticksPassed * baseLossPerTick * multiplier);
    const currentEnergy = clamp(normalized.currentEnergy - totalLoss, 0, normalized.maxEnergy);
    const energy = Object.freeze({ ...normalized, currentEnergy, lastUpdatedTick: tick });
    const status = this.statusOf(energy);

    return Object.freeze({
      energy,
      status,
      ticksPassed,
      totalLoss,
      canAct: status !== 'DECOMPOSITION',
    });
  }

  public canAffordAction(state: Partial<EnergyState> | null | undefined, cost: number): boolean {
    const normalized = this.normalizeState(state);
    const actionCost = Math.max(0, Math.trunc(finite(cost, 0)));
    return normalized.currentEnergy >= actionCost && this.statusOf(normalized) !== 'DECOMPOSITION';
  }

  public applyActionCost(state: Partial<EnergyState> | null | undefined, cost: number): ThermalActionResult {
    const normalized = this.normalizeState(state);
    const actionCost = Math.max(0, Math.trunc(finite(cost, 0)));
    const afforded = this.canAffordAction(normalized, actionCost);
    const currentEnergy = afforded ? clamp(normalized.currentEnergy - actionCost, 0, normalized.maxEnergy) : normalized.currentEnergy;
    const energy = Object.freeze({ ...normalized, currentEnergy });

    return Object.freeze({
      energy,
      status: this.statusOf(energy),
      afforded,
      appliedCost: afforded ? actionCost : 0,
    });
  }

  public allowedActionsForCritical<TAction extends string>(status: ThermalStatus, actions: readonly TAction[], _harvestAction: TAction): TAction[] {
    if (status === 'DECOMPOSITION') return [];
    return [...actions];
  }

  public statusOf(state: Partial<EnergyState> | null | undefined): ThermalStatus {
    const normalized = this.normalizeState(state);
    if (normalized.currentEnergy <= 0) return 'DECOMPOSITION';
    const ratio = normalized.currentEnergy / normalized.maxEnergy;
    if (ratio < this.criticalRatio) return 'CRITICAL';
    if (ratio > this.overheatedRatio) return 'OVERHEATED';
    return 'STABLE';
  }
}
