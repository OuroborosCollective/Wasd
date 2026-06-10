import { describe, it, expect, beforeEach } from 'vitest';
import {
  InterestGrid,
  createInterestGrid
} from '../InterestGrid';

describe('InterestGrid', () => {
  let grid: InterestGrid;

  beforeEach(() => {
    grid = new InterestGrid();
  });

  describe('register', () => {
    it('should register an observer', () => {
      grid.register('player1', 100, 100);
      expect(grid.hasObserver('player1')).toBe(true);
    });

    it('should subscribe to broadcast chunks', () => {
      grid.register('player1', 100, 100);
      const chunks = grid.getSubscribedChunks('player1');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThanOrEqual(9); // 3x3 = 9
    });

    it('should add observer to chunk reverse index', () => {
      grid.register('player1', 100, 100);
      const chunks = grid.getSubscribedChunks('player1');
      // At least one chunk should have this observer
      let found = false;
      for (const chunk of chunks) {
        const observers = grid.getObserversInChunk(chunk);
        if (observers.includes('player1')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove an observer', () => {
      grid.register('player1', 100, 100);
      grid.unregister('player1');
      expect(grid.hasObserver('player1')).toBe(false);
    });

    it('should remove from chunk reverse index', () => {
      grid.register('player1', 100, 100);
      const chunks = grid.getSubscribedChunks('player1');
      grid.unregister('player1');
      
      for (const chunk of chunks) {
        const observers = grid.getObserversInChunk(chunk);
        expect(observers).not.toContain('player1');
      }
    });
  });

  describe('updatePosition', () => {
    it('should update position', () => {
      grid.register('player1', 100, 100);
      grid.updatePosition('player1', 200, 200);
      
      const interest = grid.getObserverInterest('player1');
      expect(interest?.tileX).toBe(200);
      expect(interest?.tileY).toBe(200);
    });

    it('should handle same chunk update (no subscription change)', () => {
      grid.register('player1', 100, 100);
      const oldChunks = grid.getSubscribedChunks('player1');
      
      // Move slightly within same chunk
      grid.updatePosition('player1', 110, 110);
      const newChunks = grid.getSubscribedChunks('player1');
      
      expect(newChunks).toEqual(oldChunks);
    });

    it('should handle cross-chunk movement', () => {
      grid.register('player1', 100, 100);
      const oldChunks = grid.getSubscribedChunks('player1');
      
      // Move to different chunk
      grid.updatePosition('player1', 1000, 1000);
      const newChunks = grid.getSubscribedChunks('player1');
      
      // Chunks should have changed
      expect(newChunks).not.toEqual(oldChunks);
    });

    it('should register if not already registered', () => {
      grid.updatePosition('player1', 100, 100);
      expect(grid.hasObserver('player1')).toBe(true);
    });
  });

  describe('getObserversInChunk', () => {
    it('should return observers in a chunk', () => {
      grid.register('player1', 100, 100);
      grid.register('player2', 110, 110);
      
      // Both should be in the same chunks
      const chunks = grid.getSubscribedChunks('player1');
      for (const chunk of chunks) {
        const observers = grid.getObserversInChunk(chunk);
        if (observers.length > 0) {
          expect(observers).toContain('player1');
        }
      }
    });

    it('should return empty array for chunk with no observers', () => {
      const observers = grid.getObserversInChunk('999:999');
      expect(observers).toEqual([]);
    });
  });

  describe('getAllObservers', () => {
    it('should return all registered observers', () => {
      grid.register('player1', 100, 100);
      grid.register('player2', 200, 200);
      grid.register('player3', 300, 300);
      
      const all = grid.getAllObservers();
      expect(all).toContain('player1');
      expect(all).toContain('player2');
      expect(all).toContain('player3');
      expect(all).toHaveLength(3);
    });
  });

  describe('getObserverCount', () => {
    it('should return correct count', () => {
      expect(grid.getObserverCount()).toBe(0);
      grid.register('player1', 100, 100);
      expect(grid.getObserverCount()).toBe(1);
      grid.register('player2', 200, 200);
      expect(grid.getObserverCount()).toBe(2);
      grid.unregister('player1');
      expect(grid.getObserverCount()).toBe(1);
    });
  });

  describe('getActiveChunkCount', () => {
    it('should return number of chunks with observers', () => {
      expect(grid.getActiveChunkCount()).toBe(0);
      grid.register('player1', 100, 100);
      expect(grid.getActiveChunkCount()).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all observers', () => {
      grid.register('player1', 100, 100);
      grid.register('player2', 200, 200);
      grid.clear();
      
      expect(grid.getObserverCount()).toBe(0);
      expect(grid.getActiveChunkCount()).toBe(0);
    });
  });

  describe('createInterestGrid', () => {
    it('should create a new InterestGrid', () => {
      const g = createInterestGrid();
      g.register('test', 100, 100);
      expect(g.hasObserver('test')).toBe(true);
    });
  });
});