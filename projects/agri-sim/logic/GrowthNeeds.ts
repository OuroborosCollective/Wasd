/**
 * GrowthNeeds - Plant Growth & Needs System
 * 
 * Extracted from Ouroboros AgentNeeds (Hunger/Energy).
 * Stateless plant growth model with deterministic decay.
 * 
 * Features:
 * - Deterministic Decay: needs.water -= 0.01 * decayMultiplier per tick
 * - Integer Scaling: kappaPos eliminates floating-point drift
 * - 10-Hz Tick Processing
 * - Seed Yield Prediction
 * - Health/Needs coupling for long-term predictions
 */

/** Kappa Position */
interface KappaPos {
  x: number;
  y: number;
}

export interface PlantNeeds {
  water: number;
  energy: number;
  nutrients: number;
}

export interface Plant {
  id: string;
  species: PlantSpecies;
  position: KappaPos;
  health: number;
  needs: PlantNeeds;
  age: number;
  yieldPotential: number;
}

export enum PlantSpecies {
  WHEAT = 'wheat',
  CORN = 'corn',
  BARLEY = 'barley',
  RICE = 'rice'
}

export interface GrowthResult {
  plantId: string;
  healthChange: number;
  needsChange: number;
  expectedYield: number;
  isAlive: boolean;
}

const TICK_RATE_MS = 100;
const NEED_SCALE = 10000;
const BASE_DECAY = 100;
const HEALTH_DECAY_FLOOR = 1000;

export function toScaled(value: number): number {
  return Math.floor(value * NEED_SCALE);
}

export function toExternal(value: number): number {
  return value / NEED_SCALE;
}

export function calculateWaterDecay(decayMultiplier: number): number {
  return Math.floor(BASE_DECAY * decayMultiplier);
}

export function calculateEnergyDecay(decayMultiplier: number): number {
  return Math.floor(BASE_DECAY * decayMultiplier * 0.5);
}

export function calculateNutrientDecay(decayMultiplier: number): number {
  return Math.floor(BASE_DECAY * decayMultiplier * 0.3);
}

export function calculateNeedsDecay(decayMultiplier: number): PlantNeeds {
  return {
    water: calculateWaterDecay(decayMultiplier),
    energy: calculateEnergyDecay(decayMultiplier),
    nutrients: calculateNutrientDecay(decayMultiplier)
  };
}

export function updatePlantNeeds(plant: Plant, decayMultiplier: number = 1.0): GrowthResult {
  const decay = calculateNeedsDecay(decayMultiplier);
  
  plant.needs.water = Math.max(0, plant.needs.water - decay.water);
  plant.needs.energy = Math.max(0, plant.needs.energy - decay.energy);
  plant.needs.nutrients = Math.max(0, plant.needs.nutrients - decay.nutrients);
  
  let healthChange = 0;
  const minNeeds = Math.min(plant.needs.water, plant.needs.energy, plant.needs.nutrients);
  
  if (minNeeds <= HEALTH_DECAY_FLOOR) {
    const healthDecay = Math.floor((HEALTH_DECAY_FLOOR - minNeeds) / NEED_SCALE);
    plant.health = Math.max(0, plant.health - healthDecay);
    healthChange = -healthDecay;
  }
  
  plant.age += 1;
  const yieldFactor = calculateYieldFactor(plant);
  
  return {
    plantId: plant.id,
    healthChange,
    needsChange: -(decay.water + decay.energy + decay.nutrients),
    expectedYield: yieldFactor,
    isAlive: plant.health > 0
  };
}

export function updateAllPlants(plants: Plant[], decayMultiplier: number = 1.0): GrowthResult[] {
  return plants.map(plant => updatePlantNeeds(plant, decayMultiplier));
}

export function calculateYieldFactor(plant: Plant): number {
  const speciesYield: Record<PlantSpecies, number> = {
    [PlantSpecies.WHEAT]: 100,
    [PlantSpecies.CORN]: 150,
    [PlantSpecies.BARLEY]: 80,
    [PlantSpecies.RICE]: 120
  };
  
  const baseYield = speciesYield[plant.species] || 100;
  const healthFactor = plant.health / NEED_SCALE;
  const optimalAge = 1000;
  const ageFactor = plant.age < optimalAge ? plant.age / optimalAge : Math.max(0, 1 - (plant.age - optimalAge) / optimalAge);
  const yieldFactor = baseYield * healthFactor * ageFactor;
  
  return Math.floor(yieldFactor);
}

export function predictYieldAtTick(plant: Plant, futureTicks: number): number {
  const simPlant: Plant = {
    ...plant,
    needs: { ...plant.needs },
    yieldPotential: plant.yieldPotential
  };
  
  for (let i = 0; i < futureTicks && simPlant.health > 0; i++) {
    updatePlantNeeds(simPlant, 1.0);
  }
  
  return calculateYieldFactor(simPlant);
}

export function getPlantStatus(plant: Plant): {
  healthPercent: number;
  waterPercent: number;
  energyPercent: number;
  ageTicks: number;
  expectedYield: number;
  isHealthy: boolean;
} {
  return {
    healthPercent: toExternal(plant.health),
    waterPercent: toExternal(plant.needs.water),
    energyPercent: toExternal(plant.needs.energy),
    ageTicks: plant.age,
    expectedYield: calculateYieldFactor(plant),
    isHealthy: plant.needs.water > HEALTH_DECAY_FLOOR && plant.needs.energy > HEALTH_DECAY_FLOOR
  };
}

export default {
  toScaled,
  toExternal,
  calculateWaterDecay,
  calculateEnergyDecay,
  calculateNutrientDecay,
  calculateNeedsDecay,
  updatePlantNeeds,
  updateAllPlants,
  calculateYieldFactor,
  predictYieldAtTick,
  getPlantStatus
};
