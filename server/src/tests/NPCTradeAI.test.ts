import { describe, it, expect } from 'vitest';
import { NPCTradeAI } from '../modules/market/NPCTradeAI';

describe('NPCTradeAI', () => {
  describe('chooseTrade', () => {
    it('should return the first good if goods array is populated', () => {
      const ai = new NPCTradeAI();
      const npc = { id: 'npc-123' };
      const goods = ['apple', 'banana'];

      const result = ai.chooseTrade(npc, goods);

      expect(result).toEqual({
        npcId: 'npc-123',
        good: 'apple'
      });
    });

    it('should return null for good if goods array is empty', () => {
      const ai = new NPCTradeAI();
      const npc = { id: 'npc-456' };
      const goods: string[] = [];

      const result = ai.chooseTrade(npc, goods);

      expect(result).toEqual({
        npcId: 'npc-456',
        good: null
      });
    });
  });
});
