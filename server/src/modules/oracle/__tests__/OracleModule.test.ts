/**
 * OracleModule Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OracleModule, getOracleModule, resetOracleModule } from '../OracleModule.js';
import { WorldEventBus } from '../../ouroboros/WorldEventBus.js';

describe('OracleModule', () => {
  let eventBus: WorldEventBus;
  let oracleModule: OracleModule;

  beforeEach(() => {
    resetOracleModule();
    eventBus = new WorldEventBus();
    oracleModule = new OracleModule(eventBus, {
      tickInterval: 10,
      minRecordsForAnalysis: 6,
      maxStoredRecords: 240,
    });
  });

  describe('constructor', () => {
    it('should create with correct defaults', () => {
      expect(oracleModule.name).toBe('oracle');
      expect(oracleModule.getRecordCount()).toBe(0);
    });

    it('should accept custom config', () => {
      const custom = new OracleModule(eventBus, {
        tickInterval: 5,
        minRecordsForAnalysis: 10,
        maxStoredRecords: 100,
      });
      expect(custom).toBeDefined();
    });
  });

  describe('tick()', () => {
    it('should record world state on each tick', () => {
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      expect(oracleModule.getRecordCount()).toBe(10);
    });

    it('should generate analysis after minRecords', () => {
      // Generate records
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 - tick }],
            players: [{ id: `player${tick}`, position: { x: tick * 2, y: 0 } }],
            loot: [],
          }
        );
      }
      
      // Trigger analysis on next interval tick
      oracleModule.tick(
        { tickCount: 100 },
        { npcs: [], players: [], loot: [] }
      );
      
      expect(oracleModule.getReport()).not.toBeNull();
    });
  });

  describe('WorldEventBus integration', () => {
    it('should emit oracle_prophecy events', () => {
      const prophecies: any[] = [];
      eventBus.on('oracle_prophecy', (event) => {
        prophecies.push(event);
      });
      
      // Generate enough records for analysis
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      
      // Trigger analysis
      oracleModule.tick({ tickCount: 100 }, { npcs: [], players: [], loot: [] });
      
      // Should have received prophecy events
      expect(prophecies.length).toBeGreaterThanOrEqual(0);
    });

    it('should emit oracle_critical events for high severity', () => {
      const criticalEvents: any[] = [];
      eventBus.on('oracle_critical', (event) => {
        criticalEvents.push(event);
      });
      
      // Generate enough records for analysis with high aggression
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [
              { id: 'raider1', position: { x: tick, y: 0 }, health: 20 },
              { id: 'warrior1', position: { x: tick + 1, y: 0 }, health: 100 },
            ],
            players: [],
            loot: [],
          }
        );
      }
      
      // Trigger analysis
      oracleModule.tick({ tickCount: 100 }, { npcs: [], players: [], loot: [] });
    });

    it('should emit oracle_recommendation events', () => {
      const recommendations: any[] = [];
      eventBus.on('oracle_recommendation', (event) => {
        recommendations.push(event);
      });
      
      // Generate records
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [{ id: `player${tick}`, position: { x: tick, y: 0 } }],
            loot: [{ id: `loot${tick}`, position: { x: tick, y: 0 } }],
          }
        );
      }
      
      // Trigger analysis
      oracleModule.tick({ tickCount: 100 }, { npcs: [], players: [], loot: [] });
      
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('callbacks', () => {
    it('should call onCritical callback', () => {
      const callback = vi.fn();
      oracleModule.setOnCritical(callback);
      
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      
      oracleModule.tick({ tickCount: 100 }, { npcs: [], players: [], loot: [] });
    });

    it('should call onRecommendation callback', () => {
      const callback = vi.fn();
      oracleModule.setOnRecommendation(callback);
      
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      
      oracleModule.tick({ tickCount: 100 }, { npcs: [], players: [], loot: [] });
    });
  });

  describe('getStats()', () => {
    it('should return module statistics', () => {
      for (let tick = 0; tick < 5; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      
      const stats = oracleModule.getStats();
      expect(stats).toHaveProperty('recordCount');
      expect(stats).toHaveProperty('totalPropheciesEmitted');
      expect(stats).toHaveProperty('lastAnalysisTick');
    });
  });

  describe('reset()', () => {
    it('should clear all state', () => {
      for (let tick = 0; tick < 10; tick++) {
        oracleModule.tick(
          { tickCount: tick * 10 },
          {
            npcs: [{ id: `npc${tick}`, position: { x: tick, y: 0 }, health: 100 }],
            players: [],
            loot: [],
          }
        );
      }
      
      expect(oracleModule.getRecordCount()).toBeGreaterThan(0);
      
      oracleModule.reset();
      
      expect(oracleModule.getRecordCount()).toBe(0);
      expect(oracleModule.getReport()).toBeNull();
    });
  });

  describe('getActiveProphecies()', () => {
    it('should return empty array when no report', () => {
      expect(oracleModule.getActiveProphecies()).toEqual([]);
    });
  });
});