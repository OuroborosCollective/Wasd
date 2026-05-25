import { EmergentBrainKernel, type AREBrainDecision, type AREBrainInput, type AREBrainAction } from './EmergentBrain';
import { ThermalLogic, type EnergyState, type ThermalStatus } from './ThermalLogic';

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
  energyStats: {
    before: number;
    afterDecay: number;
    afterAction: number;
  };
  energyState: EnergyState;
  decomposition: boolean;
  reason: string;
};

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
      return Object.freeze({
        thermalStatus: decay.status,
        brainDecision: null,
        actionAllowed: false,
        finalAction: 'DECOMPOSITION' as const,
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

    const brainDecision = this.brain.process({
      ...input.brainInput,
      energy: decay.energy.currentEnergy / decay.energy.maxEnergy,
    });

    const finalAction: AREBrainAction = decay.status === 'CRITICAL' ? 'HARVEST_RESOURCE' : brainDecision.action;
    const effectiveCost = finalAction === brainDecision.action ? brainDecision.energyCost : 0;
    const action = this.thermal.applyActionCost(decay.energy, effectiveCost);

    return Object.freeze({
      thermalStatus: decay.status,
      brainDecision,
      actionAllowed: action.afforded,
      finalAction,
      energyStats: {
        before: normalizedBefore.currentEnergy,
        afterDecay: decay.energy.currentEnergy,
        afterAction: action.energy.currentEnergy,
      },
      energyState: action.energy,
      decomposition: action.status === 'DECOMPOSITION',
      reason: decay.status === 'CRITICAL'
        ? 'critical_energy_harvest_override'
        : brainDecision.reason,
    });
  }
}
