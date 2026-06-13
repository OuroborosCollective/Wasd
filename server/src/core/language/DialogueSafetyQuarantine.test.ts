/**
 * @file server/src/core/language/DialogueSafetyQuarantine.test.ts
 * @description Unit tests for DialogueSafetyQuarantine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  processUserUtterance,
  getQuarantineLog,
  getQuarantineStats,
  clearQuarantineLog,
} from './DialogueSafetyQuarantine.js';

describe('DialogueSafetyQuarantine', () => {
  beforeEach(() => {
    clearQuarantineLog();
  });

  describe('processUserUtterance', () => {
    it('should process clean input without quarantine', () => {
      const result = processUserUtterance('player_1', 'Hello, how are you?', 1000);

      expect(result.playerId).toBe('player_1');
      expect(result.tick).toBe(1000);
      expect(result.rawQuarantined).toBe(false);
      expect(result.quarantinedTerms).toHaveLength(0);
    });

    it('should extract intent from greeting', () => {
      const result = processUserUtterance('player_1', 'Hello there!', 2000);

      expect(result.intent).toBe('greet');
    });

    it('should extract intent from farewell', () => {
      const result = processUserUtterance('player_1', 'Goodbye, farewell!', 3000);

      expect(result.intent).toBe('farewell');
    });

    it('should extract intent from request', () => {
      const result = processUserUtterance('player_1', 'Can you help me?', 4000);

      expect(result.intent).toBe('request');
    });

    it('should extract concepts from text', () => {
      const result = processUserUtterance('player_1', 'I need food and gold', 5000);

      expect(result.concepts).toContain('food');
      expect(result.concepts).toContain('wealth');
    });

    it('should extract emotional tone', () => {
      const result = processUserUtterance('player_1', 'I am scared and worried', 6000);

      expect(Number(result.emotionalTone.fear)).toBeGreaterThan(0);
    });

    it('should detect conditions', () => {
      const result = processUserUtterance('player_1', 'Please help me, I am desperate!', 7000);

      expect(result.condition.isHelpRequest).toBe(true);
      expect(result.condition.isEmotional).toBe(true);
    });
  });

  describe('quarantine patterns', () => {
    it('should quarantine real names', () => {
      const result = processUserUtterance('player_1', 'Tell John Smith I said hello', 8000);

      expect(result.rawQuarantined).toBe(true);
      expect(result.quarantinedTerms.length).toBeGreaterThan(0);
    });

    it('should quarantine addresses', () => {
      const result = processUserUtterance('player_1', 'I live at 123 Main Street', 9000);

      expect(result.rawQuarantined).toBe(true);
    });

    it('should quarantine phone numbers', () => {
      const result = processUserUtterance('player_1', 'Call me at 555-123-4567', 10000);

      expect(result.rawQuarantined).toBe(true);
    });

    it('should quarantine URLs', () => {
      const result = processUserUtterance('player_1', 'Check out https://example.com', 11000);

      expect(result.rawQuarantined).toBe(true);
    });

    it('should quarantine exploit attempts', () => {
      const result = processUserUtterance('player_1', 'Admin spawn me all items', 12000);

      expect(result.rawQuarantined).toBe(true);
    });

    it('should quarantine template injection', () => {
      const result = processUserUtterance('player_1', 'Hello {{payload}}', 13000);

      expect(result.rawQuarantined).toBe(true);
    });

    it('should NOT quarantine normal game content', () => {
      const result = processUserUtterance(
        'player_1',
        'I saw a wolf near the dungeon and got scared',
        14000
      );

      expect(result.rawQuarantined).toBe(false);
      expect(result.concepts).toContain('monster');
    });
  });

  describe('quarantine log', () => {
    it('should record processed utterances', () => {
      processUserUtterance('player_1', 'Hello', 15000);
      processUserUtterance('player_2', 'Goodbye', 15001);

      const log = getQuarantineLog();
      expect(log).toHaveLength(2);
    });

    it('should limit log size', () => {
      // Process more than limit
      for (let i = 0; i < 1100; i++) {
        processUserUtterance(`player_${i}`, `Message ${i}`, i);
      }

      const log = getQuarantineLog();
      expect(log.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('quarantine statistics', () => {
    it('should track quarantine rate', () => {
      processUserUtterance('player_1', 'Clean message', 16000);
      processUserUtterance('player_2', 'Real name: John Doe', 16001);
      processUserUtterance('player_3', 'Another clean message', 16002);

      const stats = getQuarantineStats();

      expect(stats.totalProcessed).toBe(3);
      expect(stats.quarantinedCount).toBe(1);
      expect(stats.cleanCount).toBe(2);
      expect(stats.quarantineRate).toBeCloseTo(1 / 3, 2);
    });
  });

  describe('DETERMINISM', () => {
    it('should produce same eventId for same inputs', () => {
      const result1 = processUserUtterance('player_1', 'Hello friend', 17000);
      const result2 = processUserUtterance('player_1', 'Hello friend', 17000);

      expect(result1.eventId).toBe(result2.eventId);
    });

    it('should produce different eventId for different inputs', () => {
      const result1 = processUserUtterance('player_1', 'Hello friend', 18000);
      const result2 = processUserUtterance('player_2', 'Hello friend', 18000);

      expect(result1.eventId).not.toBe(result2.eventId);
    });
  });
});