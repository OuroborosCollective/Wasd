/**
 * @file server/src/tests/simulations/OracleEvolutionTest.ts
 * @description Arelorian Engine Simulation Tests
 * Tests both Mass Invasion (decay) and Restoration scenarios
 */

import { arelorianKernel } from '../../core/systems/ArelorianKernel.js';
import { worldStateRegistry, PendingMutation } from '../../core/state/WorldStateRegistry.js';
import { createDefaultRegionState, RegionState, KAPPA, OraclePressureTag, StabilityLevel } from '../../core/state/RegionState.js';
import { liveHealSystem, type RestorationMilestoneEvent } from '../../core/systems/LiveHealSystem.js';

// Configuration
const TEST_REGION = 'test_region_001';
const SIMULATION_TICKS = 2000;
const EXTRACTION_TICKS = 1000;
const AGENT_COUNT = 500;
const HEALER_COUNT = 50;

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
 * Initialize test region with COLLAPSED state (for restoration test)
 */
function initializeCollapsedRegion(): void {
  const region = createDefaultRegionState(TEST_REGION);
  
  // Set collapsed state
  region.stabilityLevel = StabilityLevel.PARTIAL_COLLAPSE;
  region.visualCorruptionState = toFP(0.9); // 90% corruption
  region.matrixEnergyBalance = 0; // 0% energy
  region.infrastructureLevel = toFP(0.1); // 10%
  region.threatLevel = toFP(0.8); // High threat
  region.tradeFlowIntensity = 0;
  
  // Resources depleted
  region.resourceSaturation.set('wood', toFP(0.1));
  region.resourceSaturation.set('stone', toFP(0.1));
  region.resourceSaturation.set('ore', toFP(0.05));
  region.resourceSaturation.set('crystal', toFP(0.05));
  
  // No active services (collapsed)
  (region as any).activeServices = [];
  
  // Register region
  worldStateRegistry.queueMutation({
    type: 'UPDATE_REGION',
    regionId: TEST_REGION,
    state: region,
  });
  
  worldStateRegistry.commitMutations();
  
  console.log(`[TEST] Initialized COLLAPSED test region`);
  console.log(`[TEST] Initial corruption: ${fromFP(region.visualCorruptionState * 100).toFixed(1)}%`);
  console.log(`[TEST] Initial energy: ${fromFP(region.matrixEnergyBalance).toFixed(2)}`);
  console.log(`[TEST] Initial stability: ${region.stabilityLevel}`);
}

/**
 * Inject healing from 50 coordinated players
 */
function injectHealingPattern(tick: number): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  // Each healer injects energy per tick
  const baseEnergyPerHealer = 5; // 5 FP per healer
  const totalEnergy = HEALER_COUNT * baseEnergyPerHealer;
  
  // Perform healing cycle
  const result = liveHealSystem.performHealingCycle(TEST_REGION, totalEnergy, toFP(0.5));
  
  // Log milestones
  const milestones = liveHealSystem.getMilestones();
  if (milestones.length > 0) {
    for (const m of milestones) {
      console.log(`[MILESTONE @${tick}] ${m.milestone}: ${fromFP(m.newValue).toFixed(2)}`);
    }
    liveHealSystem.clearMilestones();
  }
}

/**
 * Run restoration simulation
 */
async function runRestorationSimulation(): Promise<void> {
  console.log('='.repeat(70));
  console.log('ARELORIAN ENGINE - RESTORATION SCENARIO TEST');
  console.log('='.repeat(70));
  console.log(` Healers: ${HEALER_COUNT} coordinated players`);
  console.log(` Duration: ${SIMULATION_TICKS} ticks`);
  console.log('');
  
  const startTime = performance.now();
  
  // Initialize collapsed region
  initializeCollapsedRegion();
  
  // Run ticks
  for (let tick = 1; tick <= SIMULATION_TICKS; tick++) {
    const tickStart = performance.now();
    
    // Inject healing
    injectHealingPattern(tick);
    
    // Execute tick
    await arelorianKernel.tick();
    
    const tickTime = performance.now() - tickStart;
    totalTickTime += tickTime;
    
    // Monitoring checkpoints
    if (tick === 200 || tick === 400 || tick === 800 || tick === 1200 || tick === 1500) {
      logStatus(tick);
    }
    
    // Assertions
    if (tick === 400) {
      checkCorruptionReduction();
    }
    
    if (tick === 800) {
      checkServicesRestored();
    }
    
    if (tick === 1200) {
      checkPhaseRecovery();
    }
    
    if (tick === 1500) {
      checkEconomyRestored();
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
  const services = (region as any).activeServices || [];
  
  console.log(`[CHECK @${tick}] Status:`);
  console.log(`  Energy: ${energy.toFixed(2)} | Infra: ${infra.toFixed(1)}%`);
  console.log(`  Stability: ${stability} | Corruption: ${corruption.toFixed(1)}%`);
  console.log(`  Services: [${services.join(', ')}]`);
}

/**
 * Assertion: Corruption reduced under 70% at tick 400
 */
function checkCorruptionReduction(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const corruptionPercent = fromFP(region.visualCorruptionState * 100);
  const pass = corruptionPercent < 70;
  
  results.push({
    phase: 'CORRUPTION_REDUCTION',
    tick: 400,
    pass,
    value: corruptionPercent,
    expected: 70,
    details: `Corruption: ${corruptionPercent.toFixed(1)}%`,
  });
  
  console.log(`[ASSERTION @400] Corruption < 70%: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Current: ${corruptionPercent.toFixed(1)}%`);
}

/**
 * Assertion: SPAWN and QUEST services restored at tick 800
 */
function checkServicesRestored(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const services = (region as any).activeServices || [];
  const hasSpawn = services.includes('SPAWN');
  const hasQuest = services.includes('QUEST');
  const pass = hasSpawn && hasQuest;
  
  results.push({
    phase: 'SERVICE_SPAWN_QUEST',
    tick: 800,
    pass,
    value: services.length,
    expected: 2,
    details: `Services: [${services.join(', ')}]`,
  });
  
  console.log(`[ASSERTION @800] SPAWN & QUEST restored: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Services: [${services.join(', ')}]`);
}

/**
 * Assertion: Phase recovered to CONTESTED or UNSTABLE at tick 1200
 */
function checkPhaseRecovery(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const phase = region.stabilityLevel;
  const pass = phase === StabilityLevel.CONTESTED || 
               phase === StabilityLevel.UNSTABLE || 
               phase === StabilityLevel.STABLE;
  
  results.push({
    phase: 'PHASE_RECOVERY',
    tick: 1200,
    pass,
    value: phase === StabilityLevel.STABLE ? 3 : (phase === StabilityLevel.UNSTABLE ? 2 : (phase === StabilityLevel.CONTESTED ? 1 : 0)),
    expected: 1,
    details: `Stability: ${phase}`,
  });
  
  console.log(`[ASSERTION @1200] Phase recovery: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Current: ${phase}`);
}

/**
 * Assertion: ECONOMY and TRADE restored at tick 1500
 */
function checkEconomyRestored(): void {
  const worldState = worldStateRegistry.getCurrentState();
  const region = worldState.regions.get(TEST_REGION);
  
  if (!region) return;
  
  const services = (region as any).activeServices || [];
  const hasEconomy = services.includes('ECONOMY');
  const hasTrade = services.includes('TRADE');
  const pass = hasEconomy && hasTrade;
  
  results.push({
    phase: 'SERVICE_ECONOMY_TRADE',
    tick: 1500,
    pass,
    value: services.length,
    expected: 4,
    details: `Services: [${services.join(', ')}]`,
  });
  
  console.log(`[ASSERTION @1500] ECONOMY & TRADE restored: ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Services: [${services.join(', ')}]`);
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
    console.log(`         Value: ${typeof r.value === 'number' ? r.value.toFixed(2) : r.value} | Expected: ${r.expected}`);
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
runRestorationSimulation().catch(err => {
  console.error('Simulation error:', err);
  process.exit(1);
});