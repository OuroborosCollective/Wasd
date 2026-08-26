import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialBroadcastGrid, spatialBroadcastGrid } from '../SpatialBroadcastTickSystem.js';
import { createChunkKey } from '../types.js';

describe('SpatialBroadcastGrid', () => {
  let grid: SpatialBroadcastGrid;

  beforeEach(() => {
    grid = new SpatialBroadcastGrid();
  });

  describe('upsert', () => {
    it('should insert an entity into the grid', () => {
      grid.upsert('player1', 100, 200, 'player', { name: 'Test Player' });
      
      const stats = grid.getStats();
      expect(stats.totalEntities).toBe(1);
      expect(stats.byKind.player).toBe(1);
    });

    it('should update entity position within same chunk', () => {
      grid.upsert('player1', 100, 200, 'player', { name: 'Test' });
      grid.upsert('player1', 150, 250, 'player', { name: 'Test Updated' });
      
      const stats = grid.getStats();
      expect(stats.totalEntities).toBe(1);
      expect(stats.totalChunks).toBe(1);
    });

    it('should migrate entity when moving to different chunk', () => {
      // Insert at tile (100, 200) - chunk (1, 3)
      grid.upsert('player1', 100, 200, 'player', { name: 'Test' });
      
      let stats = grid.getStats();
      expect(stats.totalChunks).toBe(1);
      
      // Move to tile (1000, 2000) - chunk (15, 31) - different chunk
      grid.upsert('player1', 1000, 2000, 'player', { name: 'Test Moved' });
      
      stats = grid.getStats();
      expect(stats.totalEntities).toBe(1);
      expect(stats.totalChunks).toBe(1); // Still one chunk, but different
    });

    it('should handle multiple entities in same chunk', () => {
      grid.upsert('player1', 100, 200, 'player', {});
      grid.upsert('player2', 110, 210, 'player', {});
      grid.upsert('npc1', 120, 220, 'npc', {});
      
      const stats = grid.getStats();
      expect(stats.totalEntities).toBe(3);
      expect(stats.byKind.player).toBe(2);
      expect(stats.byKind.npc).toBe(1);
    });
  });

  describe('remove', () => {
    it('should remove an entity from the grid', () => {
      grid.upsert('player1', 100, 200, 'player', {});
      grid.remove('player1');
      
      const stats = grid.getStats();
      expect(stats.totalEntities).toBe(0);
    });

    it('should handle removing non-existent entity', () => {
      expect(() => grid.remove('non-existent')).not.toThrow();
    });
  });

  describe('getVisibleEntities', () => {
    beforeEach(() => {
      // Set up a grid with entities in known positions
      // Tile (100, 200) is in chunk (1, 3)
      grid.upsert('player1', 100, 200, 'player', { id: 'player1' });
      grid.upsert('npc1', 110, 210, 'npc', { id: 'npc1' });
      grid.upsert('loot1', 5000, 5000, 'loot', { id: 'loot1' }); // Different chunk
    });

    it('should return entities in 3x3 grid around position', () => {
      // Position in chunk (1, 3) - same as player1 and npc1
      const visible = grid.getVisibleEntities(100, 200);
      
      expect(visible.length).toBe(2); // player1 and npc1
    });

    it('should exclude entities outside visible range', () => {
      // Position far from loot1
      const visible = grid.getVisibleEntities(100, 200);
      const lootIds = visible.filter(e => e.kind === 'loot').map(e => e.id);
      
      expect(lootIds).not.toContain('loot1');
    });

    it('should include entities when player is in different chunk', () => {
      // Position in chunk (78, 78) - same as loot1 at (5000, 5000)
      const visible = grid.getVisibleEntities(5000, 5000);
      const lootIds = visible.filter(e => e.kind === 'loot').map(e => e.id);
      
      expect(lootIds).toContain('loot1');
    });
  });

  describe('getEntitiesInChunk', () => {
    it('should return all entities in a specific chunk', () => {
      grid.upsert('player1', 100, 200, 'player', {});
      grid.upsert('npc1', 110, 210, 'npc', {});
      grid.upsert('player2', 5000, 5000, 'player', {}); // Different chunk
      
      const entities = grid.getEntitiesInChunk(createChunkKey(1, 3));
      expect(entities.length).toBe(2);
    });

    it('should return empty array for empty chunk', () => {
      const entities = grid.getEntitiesInChunk(createChunkKey(999, 999));
      expect(entities.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entities from the grid', () => {
      grid.upsert('player1', 100, 200, 'player', {});
      grid.upsert('npc1', 110, 210, 'npc', {});
      
      grid.clear();
      
      const stats = grid.getStats();
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalChunks).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      // All coordinates intentionally stay in chunk (1, 3) with 64-tile chunks.
      grid.upsert('player1', 100, 200, 'player', {});
      grid.upsert('player2', 110, 210, 'player', {});
      grid.upsert('npc1', 120, 220, 'npc', {});
      grid.upsert('loot1', 126, 230, 'loot', {});
      
      const stats = grid.getStats();
      
      expect(stats.totalEntities).toBe(4);
      expect(stats.totalChunks).toBe(1);
      expect(stats.byKind.player).toBe(2);
      expect(stats.byKind.npc).toBe(1);
      expect(stats.byKind.loot).toBe(1);
    });
  });
});

describe('Global spatialBroadcastGrid instance', () => {
  it('should export a singleton instance', () => {
    expect(spatialBroadcastGrid).toBeInstanceOf(SpatialBroadcastGrid);
  });
});

import { SpatialBroadcastTickSystem } from '../SpatialBroadcastTickSystem.js';
import { TickSystemPriority } from '../TickSystem.js';
import { vi } from 'vitest';

describe('SpatialBroadcastTickSystem', () => {
  let system: SpatialBroadcastTickSystem;
  let mockGrid: any;
  let mockBroadcastHandler: any;

  beforeEach(() => {
    mockGrid = {
      clear: vi.fn(),
      upsert: vi.fn(),
      getVisibleEntities: vi.fn().mockReturnValue([]),
    };
    mockBroadcastHandler = vi.fn();
    system = new SpatialBroadcastTickSystem(mockGrid);
    system.setBroadcastHandler(mockBroadcastHandler);
  });

  it('should have correct priority and name', () => {
    expect(system.name).toBe('spatial-broadcast');
    expect(system.priority).toBe(TickSystemPriority.BROADCAST);
  });

  it('should rebuild the grid and call broadcast handler during tick', () => {
    const players = [{ id: 'p1', x: 10, y: 20, isOffline: false }];
    const npcs = [{ id: 'n1', x: 15, y: 25, name: 'Guard' }];
    
    system.setPlayerPositionProvider(() => players);
    system.setNpcPositionProvider(() => npcs);
    system.setPlayerToSocketProvider(() => new Map([['p1', 'socket1']]));
    system.setSocketToPlayerProvider(() => new Map([['socket1', 'p1']]));
    
    const visibleEntities = [
      { id: 'p1', x: 10, y: 20, kind: 'player', data: { player: players[0] } },
      { id: 'n1', x: 15, y: 25, kind: 'npc', data: { npc: npcs[0] } }
    ];
    mockGrid.getVisibleEntities.mockReturnValue(visibleEntities);

    system.tick({ tickCount: 100 as any, isHighFrequencyTick: true });

    // Grid management
    expect(mockGrid.clear).toHaveBeenCalled();
    expect(mockGrid.upsert).toHaveBeenCalledWith('p1', 10, 20, 'player', expect.anything());
    expect(mockGrid.upsert).toHaveBeenCalledWith('n1', 15, 25, 'npc', expect.anything());

    // Broadcast logic
    expect(mockBroadcastHandler).toHaveBeenCalledWith('socket1', expect.objectContaining({
      type: 'SPATIAL_SNAPSHOT',
      playerId: 'p1',
      entities: visibleEntities
    }));
  });

  it('should skip offline players', () => {
    const players = [{ id: 'p1', x: 10, y: 20, isOffline: true }];
    system.setPlayerPositionProvider(() => players);
    system.setPlayerToSocketProvider(() => new Map([['p1', 'socket1']]));
    
    system.tick({ tickCount: 100 as any, isHighFrequencyTick: true });
    
    expect(mockGrid.upsert).not.toHaveBeenCalledWith('p1', 10, 20, 'player', expect.anything());
    expect(mockBroadcastHandler).not.toHaveBeenCalled();
  });
});
