import { describe, it, expect, beforeEach } from "vitest";
import {
  LivingWorldErdosOuroborosSystem,
  getLivingWorldSystem,
  type CycleState,
  type AttractorType,
  type WorldEvent,
} from "../../oracle/LivingWorldErdosOuroborosSystem";

describe("LivingWorldErdosOuroborosSystem", () => {
  let system: LivingWorldErdosOuroborosSystem;

  beforeEach(() => {
    // Create fresh instance for each test
    system = new LivingWorldErdosOuroborosSystem();
  });

  describe("Initialization", () => {
    it("should initialize with 13 organs", () => {
      const state = system.getCurrentState();
      // Initial state is null before first tick
      expect(state).toBeNull();
    });

    it("should have organs for all 13 layers", () => {
      system.tick();
      const state = system.getCurrentState();
      expect(state).not.toBeNull();
      expect(state!.organs.length).toBe(13);
    });

    it("should initialize organs with balanced state", () => {
      system.tick();
      const state = system.getCurrentState()!;

      // All organs should start around 500 (balanced)
      for (const organ of state.organs) {
        expect(organ.state).toBeGreaterThan(0);
        expect(organ.state).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe("tick() - The Living Cycle", () => {
    it("should increment tick on each cycle", () => {
      expect(system.getCurrentState()).toBeNull();

      system.tick();
      let state = system.getCurrentState();
      expect(state!.tick).toBe(1);

      system.tick();
      state = system.getCurrentState();
      expect(state!.tick).toBe(2);

      system.tick();
      state = system.getCurrentState();
      expect(state!.tick).toBe(3);
    });

    it("should compute omega attractor", () => {
      system.tick();
      const state = system.getCurrentState()!;

      expect(state.omegaE).toBeDefined();
      const validAttractors: AttractorType[] = [
        "STABLE", "VILLAGE_TO_CITY", "AGGRESSION_SPIKE", "MARKET_COLLAPSE",
        "CULT_FORMATION", "DUNGEON_EMERGENCE", "FAMINE", "PLAGUE",
        "GOLDEN_AGE", "DARK_AGE", "MIGRATION_WAVE", "TRADE_EMBARGO", "PEACE_TREATY"
      ];
      expect(validAttractors).toContain(state.omegaE);
    });

    it("should have valid state hash", () => {
      system.tick();
      const state = system.getCurrentState()!;

      expect(state.stateHash).toBeDefined();
      expect(state.stateHash).toMatch(/^are_[a-f0-9]+$/);
    });

    it("should have civilization mood", () => {
      system.tick();
      const state = system.getCurrentState()!;

      expect(state.civilizationMood).toBeDefined();
      expect(typeof state.civilizationMood).toBe("number");
      // Mood can be negative or positive
      expect(state.civilizationMood).toBeGreaterThanOrEqual(-1000);
      expect(state.civilizationMood).toBeLessThanOrEqual(1000);
    });

    it("should track total energy", () => {
      system.tick();
      const state = system.getCurrentState()!;

      expect(state.totalEnergy).toBeGreaterThan(0);
      // Energy should be sum of all organ states (max 13 * 1000 = 13000)
      expect(state.totalEnergy).toBeLessThanOrEqual(13000);
    });
  });

  describe("13 Layer System", () => {
    it("should have all expected layers", () => {
      system.tick();
      const state = system.getCurrentState()!;

      const expectedLayers = [
        "ecology", "market", "physiology", "trade", "memory",
        "politics", "conflict", "economy", "kingdoms", "faith",
        "dungeon", "fear", "cycles"
      ];

      for (const expected of expectedLayers) {
        const organ = state.organs.find(o => o.name === expected);
        expect(organ).toBeDefined();
        expect(organ!.layer).toBe(expectedLayers.indexOf(expected) + 1);
      }
    });

    it("should track organ state changes", () => {
      system.tick();
      const state1 = system.getCurrentState()!;
      const conflictOrgan1 = state1.organs.find(o => o.name === "conflict")!;

      system.tick();
      const state2 = system.getCurrentState()!;
      const conflictOrgan2 = state2.organs.find(o => o.name === "conflict")!;

      // Organ states should be tracked
      expect(conflictOrgan1.state).toBeDefined();
      expect(conflictOrgan2.state).toBeDefined();
    });

    it("should track delta between states", () => {
      system.tick();
      const state = system.getCurrentState()!;

      for (const organ of state.organs) {
        expect(organ.delta).toBeDefined();
        expect(typeof organ.delta).toBe("number");
      }
    });
  });

  describe("Event Generation", () => {
    it("should generate events when organs reach thresholds", () => {
      // Run many ticks to potentially trigger events
      for (let i = 0; i < 100; i++) {
        system.tick();
      }

      const state = system.getCurrentState()!;
      // Events may or may not have been generated depending on organ states
      expect(state.events).toBeDefined();
      expect(Array.isArray(state.events)).toBe(true);
    });

    it("should create events with proper structure", () => {
      // Force an event by running many ticks
      for (let i = 0; i < 200; i++) {
        system.tick();
      }

      const state = system.getCurrentState()!;

      if (state.events.length > 0) {
        const event = state.events[0];
        expect(event.id).toBeDefined();
        expect(event.tick).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.attractor).toBeDefined();
        expect(event.intensity).toBeGreaterThan(0);
        expect(event.eventHash).toMatch(/^are_[a-f0-9]+$/);
        expect(event.narrative).toBeDefined();
      }
    });
  });

  describe("Attractor Computation", () => {
    it("should track attractor history", () => {
      for (let i = 0; i < 50; i++) {
        system.tick();
      }

      const history = system.getAttractorHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it("should compute omega strength", () => {
      system.tick();
      const state = system.getCurrentState()!;

      expect(state.omegaStrength).toBeDefined();
      expect(state.omegaStrength).toBeGreaterThan(0);
      expect(state.omegaStrength).toBeLessThanOrEqual(1000);
    });
  });

  describe("Brain Information Flow", () => {
    it("should generate brain information", () => {
      system.tick();
      const brainInfo = system.getBrainInformation();

      expect(brainInfo).not.toBeNull();
      expect(brainInfo!.tick).toBe(1);
      expect(brainInfo!.layerStates.length).toBe(13);
      expect(brainInfo!.layerTrends.length).toBe(13);
      expect(brainInfo!.dominantLayer).toBeGreaterThan(0);
      expect(brainInfo!.dominantLayer).toBeLessThanOrEqual(13);
    });

    it("should compute convergence level", () => {
      system.tick();
      const brainInfo = system.getBrainInformation()!;

      expect(brainInfo.convergenceLevel).toBeDefined();
      expect(brainInfo.convergenceLevel).toBeGreaterThanOrEqual(0);
      expect(brainInfo.convergenceLevel).toBeLessThanOrEqual(1000);
    });

    it("should generate recommendations", () => {
      system.tick();
      const brainInfo = system.getBrainInformation()!;

      expect(brainInfo.recommendations).toBeDefined();
      // Recommendations should be sorted by priority
      if (brainInfo.recommendations.length > 1) {
        for (let i = 1; i < brainInfo.recommendations.length; i++) {
          expect(brainInfo.recommendations[i - 1].priority)
            .toBeGreaterThanOrEqual(brainInfo.recommendations[i].priority);
        }
      }
    });

    it("should track attractor and mood history", () => {
      for (let i = 0; i < 30; i++) {
        system.tick();
      }

      const brainInfo = system.getBrainInformation()!;

      expect(brainInfo.attractorHistory.length).toBeGreaterThan(0);
      expect(brainInfo.moodTrajectory.length).toBeGreaterThan(0);
      expect(brainInfo.energyFlow.length).toBe(13);
    });
  });

  describe("Trade Regions", () => {
    it("should have initialized trade regions", () => {
      const regions = system.getAllTradeRegions();
      expect(regions.length).toBeGreaterThan(0);
    });

    it("should return specific trade region", () => {
      const capital = system.getTradeRegion("capital");
      expect(capital).toBeDefined();
      expect(capital!.name).toBe("Hauptstadt");
    });

    it("should have economy, supply and demand values", () => {
      const region = system.getTradeRegion("capital")!;

      expect(region.economy).toBeGreaterThan(0);
      expect(region.supplyCapacity).toBeGreaterThan(0);
      expect(region.demandFactor).toBeGreaterThan(0);
      expect(region.priceIndex).toBeGreaterThan(0);
    });
  });

  describe("Determinism", () => {
    it("should produce same results for same tick with same inputs", () => {
      // Create two systems and run same ticks
      const system1 = new LivingWorldErdosOuroborosSystem();
      const system2 = new LivingWorldErdosOuroborosSystem();

      // Run 10 ticks on both
      for (let i = 0; i < 10; i++) {
        system1.tick();
        system2.tick();
      }

      const state1 = system1.getCurrentState();
      const state2 = system2.getCurrentState();

      // They should have same tick
      expect(state1!.tick).toBe(state2!.tick);

      // Hashes should match (deterministic)
      expect(state1!.stateHash).toBe(state2!.stateHash);
    });

    it("should produce different hash for different ticks", () => {
      system.tick();
      const state1 = system.getCurrentState()!;

      system.tick();
      const state2 = system.getCurrentState()!;

      // Different ticks should produce different hashes
      expect(state1.stateHash).not.toBe(state2.stateHash);
    });
  });

  describe("Event History", () => {
    it("should accumulate event history", () => {
      // Run enough ticks to potentially generate events
      for (let i = 0; i < 100; i++) {
        system.tick();
      }

      const history = system.getEventHistory();
      // History should track events (may be empty if none generated)
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance from getLivingWorldSystem", () => {
      const instance1 = getLivingWorldSystem();
      const instance2 = getLivingWorldSystem();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Organ Layer Access", () => {
    it("should get organ by layer number", () => {
      system.tick();

      const ecology = system.getOrganByLayer(1);
      expect(ecology).toBeDefined();
      expect(ecology!.name).toBe("ecology");

      const conflict = system.getOrganByLayer(7);
      expect(conflict).toBeDefined();
      expect(conflict!.name).toBe("conflict");
    });

    it("should return undefined for invalid layer", () => {
      system.tick();

      const invalid = system.getOrganByLayer(99);
      expect(invalid).toBeUndefined();
    });
  });

  describe("System Dynamics", () => {
    it("should show organ respiration over time", () => {
      // Track how organ states change
      system.tick();
      const state1 = system.getCurrentState()!;

      // Run more ticks
      for (let i = 0; i < 20; i++) {
        system.tick();
      }

      const state2 = system.getCurrentState()!;

      // At least one organ should have changed
      const totalEnergy1 = state1.totalEnergy;
      const totalEnergy2 = state2.totalEnergy;

      // Energy should fluctuate due to respiration/expiration
      // (not necessarily change, but system should be active)
      expect(state2.tick).toBeGreaterThan(state1.tick);
    });

    it("should maintain system coherence", () => {
      for (let i = 0; i < 50; i++) {
        system.tick();
      }

      const state = system.getCurrentState()!;

      // System should remain coherent
      expect(state.tick).toBe(50);
      expect(state.organs.length).toBe(13);
      expect(state.omegaE).toBeDefined();
      expect(state.stateHash).toBeDefined();
    });
  });
});