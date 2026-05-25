import { EmergentBrainKernel, type AREBrainDecision, type AREBrainInput, type AREBrainAction } from './EmergentBrain';
import { ThermalLogic, type EnergyState, type ThermalStatus } from './ThermalLogic';

export type EnergyRisk = 'NONE' | 'STRAINED' | 'CRITICAL' | 'COLLAPSE_IMMINENT';

export type DecisionConsequence = {
  allowed: boolean;
  risk: EnergyRisk;
  finalAction: AREBrainAction | 'DECOMPOSITION';
  collapseRisk: boolean;
  survivalBias: number;
  energyAfterAction: number;
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
        collapseRisk: true,
        survivalBias: 1,
        energyAfterAction: decay.energy.currentEnergy,
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
        reason: 'thermal_decomposition_no_action_allowed',
      });
    }

    const survivalBias = this.calculateSurvivalBias(decay.energy);
    const brainDecision = this.brain.process({
      ...input.brainInput,
      energy: decay.energy.currentEnergy / decay.energy.maxEnergy,
      survivalBias,
    });

    const consequence = this.analyzeConsequence(decay.energy, brainDecision, survivalBias);
    const action = this.thermal.applyActionCost(decay.energy, brainDecision.energyCost);

    return Object.freeze({
      thermalStatus: decay.status,
      brainDecision,
      actionAllowed: consequence.allowed,
      finalAction: consequence.finalAction,
      consequence,
      energyStats: {
        before: normalizedBefore.currentEnergy,
        afterDecay: decay.energy.currentEnergy,
        afterAction: action.energy.currentEnergy,
      },
      energyState: action.energy,
      decomposition: consequence.collapseRisk || action.status === 'DECOMPOSITION',
      reason: consequence.collapseRisk ? `${brainDecision.reason}:thermal_risk` : brainDecision.reason,
    });
  }

  private analyzeConsequence(energy: EnergyState, decision: AREBrainDecision, survivalBias: number): DecisionConsequence {
    const energyAfterAction = Math.max(0, energy.currentEnergy - Math.max(0, decision.energyCost));
    const ratioAfterAction = energyAfterAction / energy.maxEnergy;
    const collapseRisk = energyAfterAction <= 0;
    const risk = this.riskFor(ratioAfterAction, collapseRisk);

    return Object.freeze({
      allowed: true,
      risk,
      finalAction: decision.action,
      collapseRisk,
      survivalBias,
      energyAfterAction,
    });
  }

  private calculateSurvivalBias(energy: EnergyState): number {
    const energyRatio = energy.currentEnergy / energy.maxEnergy;
    return clamp(1 - energyRatio);
  }

  private riskFor(energyRatio: number, collapseRisk: boolean): EnergyRisk {
    if (collapseRisk) return 'COLLAPSE_IMMINENT';
    if (energyRatio < 0.1) return 'CRITICAL';
    if (energyRatio < 0.25) return 'STRAINED';
    return 'NONE';
  }
}
