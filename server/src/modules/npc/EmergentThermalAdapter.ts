import { EmergentBrainKernel, type AREBrainDecision, type AREBrainInput, type AREBrainAction } from './EmergentBrain';
import { ThermalLogic, type EnergyState, type ThermalStatus } from './ThermalLogic';

export type EnergyRisk = 'NONE' | 'STRAINED' | 'CRITICAL' | 'COLLAPSE_IMMINENT';

export type DecisionConsequence = {
  allowed: boolean;
  risk: EnergyRisk;
  finalAction: AREBrainAction | 'DECOMPOSITION';
  collapseIfExecuted: boolean;
  collapseRisk: boolean;
  survivalBias: number;
  energyAfterAction: number;
  reason: string;
};

export type EmergentThermalAdapterInput = {
  brainInput: AREBrainInput;
  energyState: Partial<EnergyState> | null | undefined;
  currentTick: number;
};

export type EmergentThermalDecisionResult = {
  thermalStatus: ThermalStatus;
  brainDecision: AREBrainDecision | null;
  actionAllowed: boolean;
  finalAction: AREBrainAction | 'DECOMPOSITION';
  consequence: DecisionConsequence;
  energyStats: {
    before: number;
    afterDecay: number;
    afterAction: number;
  };
  energyState: EnergyState;
  decomposition: boolean;
  reason: string;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class EmergentThermalAdapter {
  private readonly brain: EmergentBrainKernel;
  private readonly thermal: ThermalLogic;

  constructor(options: { brain?: EmergentBrainKernel; thermal?: ThermalLogic } = {}) {
    this.brain = options.brain ?? new EmergentBrainKernel();
    this.thermal = options.thermal ?? new ThermalLogic();
  }

  public process(input: EmergentThermalAdapterInput): EmergentThermalDecisionResult {
    const normalizedBefore = this.thermal.normalizeState(input.energyState, input.currentTick);
    const decay = this.thermal.applyDecay(normalizedBefore, input.currentTick);

    if (decay.status === 'DECOMPOSITION') {
      const consequence: DecisionConsequence = Object.freeze({
        allowed: false,
        risk: 'COLLAPSE_IMMINENT',
        finalAction: 'DECOMPOSITION' as const,
        collapseIfExecuted: true,
        collapseRisk: true,
        survivalBias: 1,
        energyAfterAction: decay.energy.currentEnergy,
        reason: 'thermal_decomposition_no_action_allowed',
      });

      return Object.freeze({
        thermalStatus: decay.status,
        brainDecision: null,
        actionAllowed: false,
        finalAction: 'DECOMPOSITION' as const,
        consequence,
        energyStats: {
          before: normalizedBefore.currentEnergy,
          afterDecay: decay.energy.currentEnergy,
          afterAction: decay.energy.currentEnergy,
        },
        energyState: decay.energy,
        decomposition: true,
        reason: consequence.reason,
      });
    }

    const previousConsequence = this.analyzeEnergyPressure(decay.energy);
    const brainDecision = this.brain.process({
      ...input.brainInput,
      energy: decay.energy.currentEnergy / decay.energy.maxEnergy,
      survivalBias: previousConsequence.survivalBias,
    });

    const consequence = this.analyzeConsequence(decay.energy, brainDecision);
    const nextEnergyState = Object.freeze({
      ...decay.energy,
      currentEnergy: consequence.energyAfterAction,
    });

    return Object.freeze({
      thermalStatus: decay.status,
      brainDecision,
      actionAllowed: consequence.allowed,
      finalAction: consequence.finalAction,
      consequence,
      energyStats: {
        before: normalizedBefore.currentEnergy,
        afterDecay: decay.energy.currentEnergy,
        afterAction: nextEnergyState.currentEnergy,
      },
      energyState: nextEnergyState,
      decomposition: consequence.collapseIfExecuted,
      reason: consequence.reason,
    });
  }

  private analyzeEnergyPressure(energy: EnergyState): DecisionConsequence {
    const risk = this.riskFor(energy.currentEnergy / energy.maxEnergy, energy.currentEnergy <= 0);
    const survivalBias = this.calculateSurvivalBias(energy, risk);

    return Object.freeze({
      allowed: energy.currentEnergy > 0,
      risk,
      finalAction: energy.currentEnergy <= 0 ? 'DECOMPOSITION' : 'OBSERVE',
      collapseIfExecuted: energy.currentEnergy <= 0,
      collapseRisk: energy.currentEnergy <= 0,
      survivalBias,
      energyAfterAction: energy.currentEnergy,
      reason: `thermal_pressure_${risk.toLowerCase()}`,
    });
  }

  private analyzeConsequence(energy: EnergyState, decision: AREBrainDecision): DecisionConsequence {
    const actionCost = Math.max(0, Math.trunc(finite(decision.energyCost, 0)));
    const rawEnergyAfterAction = energy.currentEnergy - actionCost;
    const energyAfterAction = Math.max(0, rawEnergyAfterAction);
    const collapseIfExecuted = rawEnergyAfterAction <= 0;
    const ratioAfterAction = energyAfterAction / energy.maxEnergy;
    const risk = this.riskFor(ratioAfterAction, collapseIfExecuted);
    const survivalBias = this.calculateSurvivalBias({ ...energy, currentEnergy: energyAfterAction }, risk);

    return Object.freeze({
      allowed: true,
      risk,
      finalAction: decision.action,
      collapseIfExecuted,
      collapseRisk: collapseIfExecuted,
      survivalBias,
      energyAfterAction,
      reason: collapseIfExecuted
        ? `${decision.reason}:collapse_if_executed:${rawEnergyAfterAction}`
        : `${decision.reason}:thermal_risk_${risk.toLowerCase()}`,
    });
  }

  private calculateSurvivalBias(energy: EnergyState, risk: EnergyRisk): number {
    const energyRatio = energy.currentEnergy / energy.maxEnergy;
    const energyPressure = clamp(1 - energyRatio);
    const riskPressure = risk === 'COLLAPSE_IMMINENT'
      ? 1
      : risk === 'CRITICAL'
        ? 0.85
        : risk === 'STRAINED'
          ? 0.45
          : 0;

    return clamp((energyPressure * 0.72) + (riskPressure * 0.28));
  }

  private riskFor(energyRatio: number, collapseIfExecuted: boolean): EnergyRisk {
    if (collapseIfExecuted) return 'COLLAPSE_IMMINENT';
    if (energyRatio <= 0.1) return 'CRITICAL';
    if (energyRatio <= 0.3) return 'STRAINED';
    return 'NONE';
  }
}
