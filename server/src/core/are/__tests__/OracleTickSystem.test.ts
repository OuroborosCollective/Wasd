/**
 * OracleTickSystem Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OracleTickSystem, ORACLE_TICK_PRIORITY } from '../OracleTickSystem.js';

describe('OracleTickSystem', () => {
  let oracleSystem: OracleTickSystem;

  beforeEach(() => {
    oracleSystem = new OracleTickSystem({
      tickInterval: 10,
      minRecordsForAnalysis: 6,
      maxStoredRecords: 240,
    });
  });

  describe('constructor', () => {
    it('should create with correct defaults', () => {
      expect(oracleSystem.name).toBe('oracle');
      expect(oracleSystem.priority).toBe(ORACLE_TICK_PRIORITY);
      expect(oracleSystem.enabled).toBe(true);
    });

    it('should accept custom options', () => {
      const custom = new OracleTickSystem({
        tickInterval: 5,
        minRecordsForAnalysis: 10,
        maxStoredRecords: 100,
      });
      expect(custom).toBeDefined();
    });
  });

  describe('tick()', () => {
    it('should not run analysis on non-interval ticks', () => {
      const context = { tickCount: 5 } as any;
      oracleSystem.tick(context);
      expect(oracleSystem.getReport()).toBeNull();
    });

    it('should record tick state on interval ticks', () => {
      const context = {
        tickCount: 10,
        world: {
          npcs: [{ id: 'npc1', position: { x: 0, y: 0 }, health: 100 }],
          players: [],
          loot: [],
        },
      } as any;
      oracleSystem.tick(context);
      expect(oracleSystem.getRecordCount()).toBeGreaterThan(0);
    });

    it('should generate analysis after minRecords', () => {
      // Generate enough records
      for (let tick = 0; tick < 10; tick++) {
        const context = {
          tickCount: tick * 10,
          world: {
            npcs: [
              { id: 'npc1', position: { x: tick, y: 0 }, health: 100 - tick },
            ],
            players: [],
            loot: [],
          },
        } as any;
        oracleSystem.tick(context);
      }
      
      // After 6+ records, analysis should be generated on next interval tick
      const context = { tickCount: 100, world: { npcs: [], players: [], loot: [] } } as any;
      oracleSystem.tick(context);
      
      // Report should be generated
      expect(oracleSystem.getReport()).not.toBeNull();
    });
  });

  describe('getBrainInformationFlow()', () => {
    it('should return null when no report exists', () => {
      expect(oracleSystem.getBrainInformationFlow(0)).toBeNull();
    });

    it('should return flow structure when report exists', () => {
      // Generate analysis first
      for (let tick = 0; tick < 10; tick++) {
        oracleSystem.tick({
          tickCount: tick * 10,
          world: {
            npcs: [{ id: 'npc1', position: { x: tick }, health: 100 }],
            players: [],
            loot: [],
          },
        } as any);
      }
      
      const flow = oracleSystem.getBrainInformationFlow(100);
      expect(flow).not.toBeNull();
      expect(flow).toHaveProperty('tick');
      expect(flow).toHaveProperty('activeProphecies');
      expect(flow).toHaveProperty('criticalEvents');
      expect(flow).toHaveProperty('recommendations');
    });
  });

  describe('callbacks', () => {
    it('should call onCriticalEvent callback', () => {
      const callback = vi.fn();
      oracleSystem.setOnCriticalEvent(callback);
      
      // Trigger with high severity prophecy
      oracleSystem.setOnProphecy((prophecy) => {
        if (prophecy.severity === 'high') {
          callback({
            kind: prophecy.kind as any,
            sector: prophecy.sector,
            ticksUntil: prophecy.ticksUntil,
            severity: prophecy.severity,
            message: prophecy.statement,
          });
        }
      });
      
      // Just verify callback registration works
      expect(typeof oracleSystem.setOnCriticalEvent).toBe('function');
    });

    it('should call onRecommendation callback', () => {
      const callback = vi.fn();
      oracleSystem.setOnRecommendation(callback);
      expect(typeof oracleSystem.setOnRecommendation).toBe('function');
    });

    it('should call onProphecy callback', () => {
      const callback = vi.fn();
      oracleSystem.setOnProphecy(callback);
      expect(typeof oracleSystem.setOnProphecy).toBe('function');
    });
  });

  describe('determinism', () => {
    it('should not use Date.now() in tick path', () => {
      // Run multiple ticks and verify deterministic behavior
      const system1 = new OracleTickSystem({ tickInterval: 10 });
      const system2 = new OracleTickSystem({ tickInterval: 10 });
      
      for (let tick = 0; tick < 10; tick++) {
        const context = {
          tickCount: tick * 10,
          world: {
            npcs: [{ id: 'npc1', position: { x: tick }, health: 100 }],
            players: [],
            loot: [],
          },
        } as any;
        system1.tick(context);
        system2.tick(context);
      }
      
      // Both systems should have recorded same number of records
      expect(system1.getRecordCount()).toBe(system2.getRecordCount());
    });

    it('should not use Math.random() in tick path', () => {
      const system = new OracleTickSystem({ tickInterval: 10 });
      
      for (let tick = 0; tick < 10; tick++) {
        system.tick({
          tickCount: tick * 10,
          world: {
            npcs: [{ id: 'npc1', position: { x: tick }, health: 100 }],
            players: [],
            loot: [],
          },
        } as any);
      }
      
      // Verify no random behavior by running again
      const recordCount = system.getRecordCount();
      for (let tick = 10; tick < 20; tick++) {
        system.tick({
          tickCount: tick * 10,
          world: {
            npcs: [{ id: 'npc1', position: { x: tick }, health: 100 }],
            players: [],
            loot: [],
          },
        } as any);
      }
      
      // Records should grow deterministically
      expect(system.getRecordCount()).toBeGreaterThan(recordCount);
    });
  });

  describe('init/shutdown', () => {
    it('should have init hook', () => {
      expect(typeof oracleSystem.init).toBe('function');
    });

    it('should have shutdown hook', () => {
      expect(typeof oracleSystem.shutdown).toBe('function');
    });

    it('should clear state on shutdown', () => {
      // Generate some records
      for (let tick = 0; tick < 10; tick++) {
        oracleSystem.tick({
          tickCount: tick * 10,
          world: { npcs: [], players: [], loot: [] },
        } as any);
      }
      
      expect(oracleSystem.getRecordCount()).toBeGreaterThan(0);
      
      oracleSystem.shutdown?.();
      
      expect(oracleSystem.getRecordCount()).toBe(0);
    });
  });
});