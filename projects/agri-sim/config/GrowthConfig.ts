export const BASE_WATER_DECAY = 0.01;
export const HEALTH_PENALTY = 1.0;

export enum GrowthStage {
    SEED = 'SEED',
    SPROUT = 'SPROUT',
    VEGETATIVE = 'VEGETATIVE',
    FLOWERING = 'FLOWERING',
    MATURE = 'MATURE'
}

export const GROWTH_STAGES: GrowthStage[] = [
    GrowthStage.SEED,
    GrowthStage.SPROUT,
    GrowthStage.VEGETATIVE,
    GrowthStage.FLOWERING,
    GrowthStage.MATURE
];

export interface PlantTypeConfig {
    growthSpeedMultiplier: number;
    waterRequirementMultiplier: number;
    healthResilience: number;
}

export const PLANT_TYPE_MULTIPLIERS: Record<string, PlantTypeConfig> = {
    WHEAT: {
        growthSpeedMultiplier: 1.2,
        waterRequirementMultiplier: 0.8,
        healthResilience: 1.1
    },
    CORN: {
        growthSpeedMultiplier: 0.9,
        waterRequirementMultiplier: 1.3,
        healthResilience: 1.0
    },
    TOMATO: {
        growthSpeedMultiplier: 1.1,
        waterRequirementMultiplier: 1.5,
        healthResilience: 0.7
    },
    POTATO: {
        growthSpeedMultiplier: 0.8,
        waterRequirementMultiplier: 0.7,
        healthResilience: 1.4
    },
    DEFAULT: {
        growthSpeedMultiplier: 1.0,
        waterRequirementMultiplier: 1.0,
        healthResilience: 1.0
    }
};