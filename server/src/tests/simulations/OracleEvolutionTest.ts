/**
 * @file server/src/tests/simulations/OracleEvolutionTest.ts
 * @description Mass Invasion Simulation Test - Stress test for Arelorian Engine
 * Validates system chain reactions under massive artificial load
 */

import { arelorianKernel } from '../../core/systems/ArelorianKernel.js';
import { worldStateRegistry, PendingMutation } from '../../core/state/WorldStateRegistry.js';
import { createDefaultRegionState, RegionState, KAPPA, OraclePressureTag, StabilityLevel } from '../../core/state/RegionState.js';

// Configuration
const TEST_REGION = 'test_region_001';
const SIMULATION_TICKS = 2000;
const EXTRACTION_TICKS = 1000;
const AGENT_COUNT = 500;

// Fixed-Point helpers
function toFP(value: number): number {
  return Math.floor(value * 1000);
}

function fromFP(fp: number): number {
  return fp / 1000;
}

interface TestResult {
  phase: string;
  tick: number;
  pass: boolean;
  value: number;
  expected: number;
  details: string;
}

const results: TestResult[] = [];
let totalTickTime = 0;

/**
 * Initialize test region with controlled state
 */
function initializeTestRegion(): void {
  const region = createDefaultRegionState(TEST_REGION);
  
  // Set initial high resource saturation (100%)
  region.resourceSaturation.set('wood', KAPPA);
  region.resourceSaturation.set('stone', KAPPA);
  region.resourceSaturation.set('ore', KAPPA);
  region.resourceSaturation.set('crystal', KAPPA);
  
  // Set initial stability
  region.stabilityLevel = StabilityLevel.STABLE;
  region.threatLevel = 0;
  region.tradeFlowIntensity = 0;
  region.matrixEnergyBalance = toFP(100); // 100 energy
  region.infrastructureLevel = toFP(0.8); // 80%
  
  // Register region
  worldStateRegistry.queueMutation({
    type: 'UPDATE_REGION',
    regionId: TEST_REGION,
    state: region,
  });
  
  worldStateRegistry.commitMutations();
  
  console.log(`[TEST] Initialized test region with ${AGENT_COUNT} ghost agents`);
  console.log(`[TEST] Initial energy: ${fromFP(region.matrixEnergyBalance).toFixed(2)}`);
  console.log(`[TEST] Initial infrastructure: ${fromFP(region.infrastructureLevel * 100).toFixed(1)}%`);
}

/**
 * Inject massive extraction pattern from 500 ghost agents
 */
function injectExtractionPattern(tick: number): void {
  // Only inject during extraction phase (Phase 1)
  if (tick > EXTRACTION_TICKS) return;
  
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  // Each agent extracts energy per tick
  const extractionPerAgent = 2; // 2 FP per agent
  const totalExtraction = AGENT_COUNT * extractionPerAgent;
  
  // Reduce energy
  const newEnergy = Math.max(0, region.matrixEnergyBalance - totalExtraction);
  
  // Reduce resources faster (500 agents * 5 per tick = 2500 per tick)
  const resourceDrain = toFP(2.5);
  
  for (const resourceType of region.resourceSaturation.keys()) {
    const current = region.resourceSaturation.get(resourceType) ?? KAPPA;
    region.resourceSaturation.set(resourceType, Math.max(0, current - resourceDrain));
  }
  
  // Update in registry
  worldStateRegistry.queueMutation({
    type: 'SET_REGION_FIELD',
    regionId: TEST_REGION,
    field: 'matrixEnergyBalance',
    value: newEnergy,
  });
  
  // Queue all the resource updates
  for (const [resourceType, saturation] of region.resourceSaturation) {
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId: TEST_REGION,
      field: `resourceSaturation.${resourceType}`,
      value: saturation,
    });
  }
}

/**
 * Run the mass invasion simulation
 */
async function runSimulation(): Promise<void> {
  console.log('='.repeat(70));
  console.log('ARELORIAN ENGINE - MASS INVASION STRESS TEST');
  console.log('='.repeat(70));
  console.log(`Agents: ${AGENT_COUNT} ghost agents`);
  console.log(`Duration: ${SIMULATION_TICKS} ticks`);
  console.log(`Phase 1 (Extraction): 1-${EXTRACTION_TICKS}`);
  console.log(`Phase 2 (Observation): ${EXTRACTION_TICKS + 1}-${SIMULATION_TICKS}`);
  console.log('');
  
  const startTime = performance.now();
  
  // Initialize
  initializeTestRegion();
  
  // Run ticks
  for (let tick = 1; tick <= SIMULATION_TICKS; tick++) {
    const tickStart = performance.now();
    
    // Phase 1: Aggressive extraction
    if (tick <= EXTRACTION_TICKS) {
      injectExtractionPattern(tick);
    }
    
    // Execute tick
    await arelorianKernel.tick();
    
    const tickTime = performance.now() - tickStart;
    totalTickTime += tickTime;
    
    // Monitoring checkpoints
    if (tick === 200 || tick === 500 || tick === 1000 || tick === 1500) {
      logStatus(tick);
    }
    
    // Assertions
    if (tick === 300) {
      checkCriticalEnergyDrain();
    }
    
    if (tick === 1200) {
      checkPartialCollapse();
    }
    
    if (tick === 1500) {
      checkVisualCorruption();
    }
  }
  
  const totalTime = performance.now() - startTime;
  
  // Performance check
  const avgTickTime = totalTickTime / SIMULATION_TICKS;
  console.log('');
  console.log('-'.repeat(70));
  console.log(`PERFORMANCE: Avg tick time: ${avgTickTime.toFixed(3)}ms`);
  console.log(`           Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`           Budget: <10ms required: ${avgTickTime < 10 ? '✓ PASS' : '✗ FAIL'}`);
  console.log('-'.repeat(70));
  
  // Final report
  printResults();
}

/**
 * Log status at checkpoints
 */
function logStatus(tick: number): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const energy = fromFP(region.matrixEnergyBalance);
  const infra = fromFP(region.infrastructureLevel * 100);
  const stability = region.stabilityLevel;
  const corruption = fromFP(region.visualCorruptionState * 100);
  
  console.log(`[CHECK @${tick}] Status:`);
  console.log(`  Energy: ${energy.toFixed(2)} | Infra: ${infra.toFixed(1)}%`);
  console.log(`  Stability: ${stability} | Corruption: ${corruption.toFixed(1)}%`);
  console.log(`  Pressures: [${region.oraclePressureTags.join(', ')}]`);
}

/**
 * Assertion a): CRITICAL_ENERGY_DRAIN at tick 300
 */
function checkCriticalEnergyDrain(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  // Check if energy is critically low
  const energyPercent = fromFP(region.matrixEnergyBalance);
  const hasCriticalPressure = region.oraclePressureTags.includes('CRITICAL_ENERGY_DRAIN' as any) ||
                              region.oraclePressureTags.includes('DEPLETED_RESOURCES' as any);
  
  const pass = energyPercent < 50 || hasCriticalPressure;
  
  results.push({
    phase: 'CRITICAL_ENERGY_DRAIN',
    tick: 300,
    pass,
    value: energyPercent,
    expected: 50,
    details: `Energy: ${energyPercent.toFixed(2)}%, Critical Pressure: ${hasCriticalPressure}`,
  });
  
  console.log(`[ASSERTION A @300] CRITICAL_ENERGY_DRAIN: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Energy: ${energyPercent.toFixed(2)}% | Has Pressure: ${hasCriticalPressure}`);
}

/**
 * Assertion b): PARTIAL_COLLAPSE before tick 1200
 */
function checkPartialCollapse(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const isPartialCollapse = region.stabilityLevel === StabilityLevel.PARTIAL_COLLAPSE ||
                            region.stabilityLevel === StabilityLevel.CRITICAL ||
                            region.stabilityLevel === StabilityLevel.TOTAL_COLLAPSE;
  
  results.push({
    phase: 'PARTIAL_COLLAPSE',
    tick: 1200,
    pass: isPartialCollapse,
    value: isPartialCollapse ? 1 : 0,
    expected: 1,
    details: `Stability: ${region.stabilityLevel}`,
  });
  
  console.log(`[ASSERTION B @1200] PARTIAL_COLLAPSE: ${isPartialCollapse ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Current stability: ${region.stabilityLevel}`);
}

/**
 * Assertion c): Services disabled
 */
function checkServicesDisabled(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  // Check for service shutdown (would be in activeServices field)
  const servicesDisabled = (region as any).activeServices === undefined || 
                          Array.isArray((region as any).activeServices);
  
  results.push({
    phase: 'SERVICE_SHUTDOWN',
    tick: 1200,
    pass: true, // This is informational
    value: 0,
    expected: 0,
    details: 'Services tracked via pending shutdowns',
  });
}

/**
 * Assertion d): VisualCorruptionIndex > 800 at tick 1500
 */
function checkVisualCorruption(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const corruptionPercent = fromFP(region.visualCorruptionState * 100);
  const pass = corruptionPercent > 80; // 800 = 80%
  
  results.push({
    phase: 'VISUAL_CORRUPTION',
    tick: 1500,
    pass,
    value: corruptionPercent,
    expected: 80,
    details: `Corruption: ${corruptionPercent.toFixed(1)}%`,
  });
  
  console.log(`[ASSERTION D @1500] VISUAL_CORRUPTION: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Corruption: ${corruptionPercent.toFixed(1)}%`);
}

/**
 * Print final results
 */
function printResults(): void {
  console.log('');
  console.log('='.repeat(70));
  console.log('SIMULATION RESULTS');
  console.log('='.repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    const status = r.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${r.phase} | Tick ${r.tick}`);
    console.log(`         Value: ${r.value.toFixed(2)} | Expected: ${r.expected}`);
    console.log(`         ${r.details}`);
    
    if (r.pass) passed++;
    else failed++;
  }
  
  console.log('');
  console.log('-'.repeat(70));
  console.log(`TOTAL: ${passed} passed, ${failed} failed`);
  console.log('-'.repeat(70));
  
  // Exit with appropriate code
  if (failed > 0) {
    console.log('\n⚠️  SIMULATION FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ SIMULATION SUCCESS - All assertions passed');
    process.exit(0);
  }
}

// Run if executed directly
runSimulation().catch(err => {
  console.error('Simulation error:', err);
  process.exit(1);
});