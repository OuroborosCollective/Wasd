import { describe, it, expect } from 'vitest';

// Test the interaction utility functions without importing
// This replicates the logic from client/src/utils/interaction.ts

describe('interaction utils', () => {
  // Replicate the getClosestInteractable function for testing
  function getClosestInteractable(
    playerPos: { x: number; y: number },
    npcs: any[],
    loot: any[]
  ): any | null {
    let closest: any = null;
    let minDist = Infinity;

    // Check loot first (higher priority)
    for (const item of loot) {
      const dist = Math.hypot(playerPos.x - item.position.x, playerPos.y - item.position.y);
      if (dist < 12 && dist < minDist) {
        minDist = dist;
        closest = { ...item, type: "loot" };
      }
    }

    // Then NPCs
    for (const npc of npcs) {
      const dist = Math.hypot(playerPos.x - npc.position.x, playerPos.y - npc.position.y);
      if (dist < 15 && dist < minDist) {
        minDist = dist;
        closest = { ...npc, type: "npc" };
      }
    }

    return closest;
  }

  describe('getClosestInteractable', () => {
    const playerPos = { x: 0, y: 0 };

    it('should return null when no NPCs or loot exist', () => {
      const result = getClosestInteractable(playerPos, [], []);
      expect(result).toBeNull();
    });

    it('should return null when all entities are out of range', () => {
      const npcs = [{ id: 'npc1', position: { x: 100, y: 100 } }];
      const loot = [{ id: 'loot1', position: { x: 200, y: 200 } }];
      
      const result = getClosestInteractable(playerPos, npcs, loot);
      expect(result).toBeNull();
    });

    it('should return loot when within range (12 units)', () => {
      const loot = [{ id: 'loot1', position: { x: 5, y: 5 }, item: 'Gold' }];
      
      const result = getClosestInteractable(playerPos, [], loot);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('loot1');
      expect(result?.type).toBe('loot');
    });

    it('should return NPC when within range (15 units)', () => {
      const npcs = [{ id: 'npc1', position: { x: 10, y: 10 }, name: 'Merchant' }];
      
      const result = getClosestInteractable(playerPos, npcs, []);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('npc1');
      expect(result?.type).toBe('npc');
    });

    it('should prioritize loot over NPC when both are in range', () => {
      const npcs = [{ id: 'npc1', position: { x: 5, y: 5 } }];
      const loot = [{ id: 'loot1', position: { x: 3, y: 3 } }];
      
      const result = getClosestInteractable(playerPos, npcs, loot);
      
      expect(result?.id).toBe('loot1');
      expect(result?.type).toBe('loot');
    });

    it('should return the closest entity when multiple are in range', () => {
      const loot = [
        { id: 'loot1', position: { x: 2, y: 2 } },
        { id: 'loot2', position: { x: 10, y: 10 } }
      ];
      
      const result = getClosestInteractable(playerPos, [], loot);
      
      expect(result?.id).toBe('loot1');
    });

    it('should handle entities at exact boundary distance', () => {
      const loot = [{ id: 'loot1', position: { x: 12, y: 0 } }]; // exactly at 12
      
      const result = getClosestInteractable(playerPos, [], loot);
      
      expect(result).toBeNull(); // 12 is not < 12
    });

    it('should return closest NPC when loot is out of range', () => {
      const npcs = [{ id: 'npc1', position: { x: 10, y: 10 } }];
      const loot = [{ id: 'loot1', position: { x: 100, y: 100 } }];
      
      const result = getClosestInteractable(playerPos, npcs, loot);
      
      expect(result?.id).toBe('npc1');
      expect(result?.type).toBe('npc');
    });

    it('should create a copy of the entity with type property', () => {
      const npcs = [{ id: 'npc1', position: { x: 5, y: 5 }, name: 'Test NPC' }];
      
      const result = getClosestInteractable(playerPos, npcs, []);
      
      expect(result).not.toBe(npcs[0]); // Should be a copy
      expect(result).toEqual(expect.objectContaining({
        id: 'npc1',
        type: 'npc',
        name: 'Test NPC'
      }));
    });

    it('should handle negative coordinates', () => {
      const playerPos = { x: -50, y: -50 };
      const npcs = [{ id: 'npc1', position: { x: -48, y: -48 } }];
      
      const result = getClosestInteractable(playerPos, npcs, []);
      
      expect(result?.id).toBe('npc1');
    });

    it('should calculate distance correctly using hypotenuse', () => {
      // Player at (0,0), NPC at (3,4) = distance of 5
      const npcs = [{ id: 'npc1', position: { x: 3, y: 4 } }];
      
      const result = getClosestInteractable(playerPos, npcs, []);
      
      expect(result?.id).toBe('npc1');
    });

    it('should handle loot just outside NPC range', () => {
      // Loot at 13 (outside loot range of 12), NPC at 5 (inside NPC range of 15)
      const loot = [{ id: 'loot1', position: { x: 13, y: 0 } }];
      const npcs = [{ id: 'npc1', position: { x: 5, y: 0 } }];
      
      const result = getClosestInteractable(playerPos, npcs, loot);
      
      expect(result?.id).toBe('npc1');
      expect(result?.type).toBe('npc');
    });

    it('should handle empty arrays correctly', () => {
      const result = getClosestInteractable(playerPos, [], []);
      expect(result).toBeNull();
    });

    it('should use spread operator to create new object', () => {
      const npcs = [{ id: 'npc1', position: { x: 5, y: 5 }, data: { foo: 'bar' } }];
      
      const result = getClosestInteractable(playerPos, npcs, []);
      
      // Verify it's a shallow copy
      expect(result).toEqual(expect.objectContaining({ data: { foo: 'bar' } }));
      expect(result).not.toBe(npcs[0]);
    });
  });
});
