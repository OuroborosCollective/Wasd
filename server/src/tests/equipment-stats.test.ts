'use strict';

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EquipmentStatKey,
  EquipmentStatBlock,
  EquipmentStat,
  EQUIPMENT_STAT_CAPS,
  createDefaultStatBlock,
  statKeyToPropertyName,
  isEquipmentStatKey,
  capStatValue,
} from '../../src/equipment/EquipmentStatTypes.js';
import {
  mapAffixToEquipmentStat,
  mapAffixesToEquipmentStats,
  canMapAffixStat,
  getEquipmentStatKeyForAffixStat,
  findUnknownStatsInAttributes,
} from '../../src/equipment/AffixStatMapping.js';
import {
  calculateEquipmentStats,
  calculateEffectiveMagicFind,
  calculateEffectiveGatheringYield,
  mergeStatBlocks,
} from '../../src/equipment/EquipmentStatService.js';
import {
  calculateCombatEquipmentStats,
  applyDefense,
  shouldCrit,
  calculateFinalDamage,
  critChancePermilleToDecimal,
} from '../../src/equipment/CombatEquipmentHook.js';
import {
  calculateLootEquipmentStats,
  extendLootContextWithEquipment,
} from '../../src/equipment/LootEquipmentHook.js';
import {
  calculateGatheringEquipmentStats,
  GATHERING_YIELD_CAP,
} from '../../src/equipment/GatheringEquipmentHook.js';
import { getSlotForBaseType, getSlotCategory, isGatheringSlot, isCombatSlot, COMBAT_SLOT_IDS } from '../../src/equipment/LootEquipmentSlots.js';
import type { PlayerEquipmentState } from '../../src/equipment/EquipmentTypes.js';

// ---------------------------------------------------------------------------
// EquipmentStatTypes Tests
// ---------------------------------------------------------------------------
describe('EquipmentStatTypes', () => {
  describe('EquipmentStatKey', () => {
    it('should include all expected stat keys', () => {
      const expectedKeys: EquipmentStatKey[] = [
        'attack_power',
        'defense',
        'max_health',
        'max_stamina',
        'magic_find',
        'gathering_yield',
        'gathering_xp',
        'loot_quality',
        'critical_chance_per_mille',
      ];

      for (const key of expectedKeys) {
        expect(isEquipmentStatKey(key)).toBe(true);
      }
    });

    it('should reject unknown stat keys', () => {
      expect(isEquipmentStatKey('unknown_stat')).toBe(false);
      expect(isEquipmentStatKey('admin_power')).toBe(false);
      expect(isEquipmentStatKey('')).toBe(false);
    });
  });

  describe('EQUIPMENT_STAT_CAPS', () => {
    it('should have caps for all stat keys', () => {
      expect(EQUIPMENT_STAT_CAPS.attack_power).toBe(100);
      expect(EQUIPMENT_STAT_CAPS.defense).toBe(100);
      expect(EQUIPMENT_STAT_CAPS.max_health).toBe(500);
      expect(EQUIPMENT_STAT_CAPS.max_stamina).toBe(500);
      expect(EQUIPMENT_STAT_CAPS.magic_find).toBe(300);
      expect(EQUIPMENT_STAT_CAPS.gathering_yield).toBe(5);
      expect(EQUIPMENT_STAT_CAPS.gathering_xp).toBe(500);
      expect(EQUIPMENT_STAT_CAPS.loot_quality).toBe(300);
      expect(EQUIPMENT_STAT_CAPS.critical_chance_per_mille).toBe(250);
    });

    it('should have positive caps for all stats', () => {
      for (const key of Object.keys(EQUIPMENT_STAT_CAPS)) {
        expect(EQUIPMENT_STAT_CAPS[key as EquipmentStatKey]).toBeGreaterThan(0);
      }
    });
  });

  describe('createDefaultStatBlock', () => {
    it('should create stat block with all zeros', () => {
      const block = createDefaultStatBlock();

      expect(block.attackPower).toBe(0);
      expect(block.defense).toBe(0);
      expect(block.maxHealth).toBe(0);
      expect(block.maxStamina).toBe(0);
      expect(block.magicFind).toBe(0);
      expect(block.gatheringYield).toBe(0);
      expect(block.gatheringXp).toBe(0);
      expect(block.lootQuality).toBe(0);
      expect(block.criticalChancePerMille).toBe(0);
    });

    it('should return frozen object', () => {
      const block = createDefaultStatBlock();
      expect(Object.isFrozen(block)).toBe(true);
    });
  });

  describe('statKeyToPropertyName', () => {
    it('should convert snake_case to camelCase', () => {
      expect(statKeyToPropertyName('attack_power')).toBe('attackPower');
      expect(statKeyToPropertyName('defense')).toBe('defense');
      expect(statKeyToPropertyName('max_health')).toBe('maxHealth');
      expect(statKeyToPropertyName('magic_find')).toBe('magicFind');
      expect(statKeyToPropertyName('critical_chance_per_mille')).toBe('criticalChancePerMille');
    });
  });

  describe('capStatValue', () => {
    it('should cap values at maximum', () => {
      expect(capStatValue('attack_power', 200)).toBe(100);
      expect(capStatValue('defense', 150)).toBe(100);
      expect(capStatValue('magic_find', 500)).toBe(300);
    });

    it('should not modify values within range', () => {
      expect(capStatValue('attack_power', 50)).toBe(50);
      expect(capStatValue('defense', 100)).toBe(100);
    });

    it('should floor decimal values', () => {
      expect(capStatValue('attack_power', 50.9)).toBe(50);
      expect(capStatValue('magic_find', 100.5)).toBe(100);
    });

    it('should not return negative values', () => {
      expect(capStatValue('attack_power', -10)).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// AffixStatMapping Tests
// ---------------------------------------------------------------------------
describe('AffixStatMapping', () => {
  describe('mapAffixToEquipmentStat', () => {
    it('should map damage stat to attack_power', () => {
      const result = mapAffixToEquipmentStat({ stat: 'damage', value: 10 });
      expect(result).not.toBeNull();
      expect(result!.statKey).toBe('attack_power');
      expect(result!.cappedValue).toBe(10);
    });

    it('should map armor stat to defense', () => {
      const result = mapAffixToEquipmentStat({ stat: 'armor', value: 15 });
      expect(result).not.toBeNull();
      expect(result!.statKey).toBe('defense');
    });

    it('should map vitality stat to max_health', () => {
      const result = mapAffixToEquipmentStat({ stat: 'vitality', value: 20 });
      expect(result).not.toBeNull();
      expect(result!.statKey).toBe('max_health');
    });

    it('should map magic_find stat correctly', () => {
      const result = mapAffixToEquipmentStat({ stat: 'magic_find', value: 50 });
      expect(result).not.toBeNull();
      expect(result!.statKey).toBe('magic_find');
    });

    it('should return null for unknown stats', () => {
      expect(mapAffixToEquipmentStat({ stat: 'unknown_stat', value: 10 })).toBeNull();
    });

    it('should cap values at maximum', () => {
      const result = mapAffixToEquipmentStat({ stat: 'attack_power', value: 200 });
      expect(result).not.toBeNull();
      expect(result!.cappedValue).toBe(100); // attack_power cap is 100
    });

    it('should handle damageMax and damageMin aliases', () => {
      const result1 = mapAffixToEquipmentStat({ stat: 'damageMax', value: 5 });
      const result2 = mapAffixToEquipmentStat({ stat: 'damageMin', value: 3 });
      expect(result1?.statKey).toBe('attack_power');
      expect(result2?.statKey).toBe('attack_power');
    });
  });

  describe('mapAffixesToEquipmentStats', () => {
    it('should map multiple affixes', () => {
      const affixes = [
        { stat: 'damage', value: 10 },
        { stat: 'armor', value: 5 },
        { stat: 'magic_find', value: 20 },
      ];
      const results = mapAffixesToEquipmentStats(affixes);

      expect(results).toHaveLength(3);
      expect(results.some(r => r.statKey === 'attack_power')).toBe(true);
      expect(results.some(r => r.statKey === 'defense')).toBe(true);
      expect(results.some(r => r.statKey === 'magic_find')).toBe(true);
    });

    it('should skip unknown affixes', () => {
      const affixes = [
        { stat: 'damage', value: 10 },
        { stat: 'unknown_stat', value: 999 },
        { stat: 'magic_find', value: 20 },
      ];
      const results = mapAffixesToEquipmentStats(affixes);

      expect(results).toHaveLength(2);
      expect(results.some(r => r.statKey === 'attack_power')).toBe(true);
      expect(results.some(r => r.statKey === 'magic_find')).toBe(true);
    });

    it('should return empty array for empty input', () => {
      expect(mapAffixesToEquipmentStats([])).toEqual([]);
    });
  });

  describe('findUnknownStatsInAttributes', () => {
    it('should find unknown stats', () => {
      const attributes = {
        damage: 10,
        unknown_stat: 999,
        magic_find: 20,
      };
      const unknown = findUnknownStatsInAttributes(attributes);
      expect(unknown).toContain('unknown_stat');
    });

    it('should return empty array when all stats known', () => {
      const attributes = {
        damage: 10,
        armor: 5,
        vitality: 20,
      };
      expect(findUnknownStatsInAttributes(attributes)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// EquipmentStatService Tests
// ---------------------------------------------------------------------------
describe('EquipmentStatService', () => {
  describe('calculateEquipmentStats', () => {
    it('should return zero block for empty equipment', () => {
      const equipment: PlayerEquipmentState = {
        playerId: 'player_1',
        schemaVersion: 1,
        slots: [],
      };

      const result = calculateEquipmentStats({ equipment });
      expect(result.attackPower).toBe(0);
      expect(result.defense).toBe(0);
    });

    it('should aggregate stats from procedural items', () => {
      const equipment: PlayerEquipmentState = {
        playerId: 'player_1',
        schemaVersion: 1,
        slots: [
          { slotId: 'weapon', itemId: 'proc_sword_1', title: 'Sword', tier: 0 },
          { slotId: 'ring', itemId: 'proc_ring_1', title: 'Ring', tier: 0 },
        ],
      };

      const proceduralStats = new Map([
        ['proc_sword_1', [
          { key: 'attack_power', value: 15 },
          { key: 'critical_chance_per_mille', value: 50 },
        ]],
        ['proc_ring_1', [
          { key: 'magic_find', value: 100 },
          { key: 'defense', value: 5 },
        ]],
      ]);

      const result = calculateEquipmentStats({ equipment, proceduralItemStats: proceduralStats });

      expect(result.attackPower).toBe(15);
      expect(result.defense).toBe(5);
      expect(result.magicFind).toBe(100);
      expect(result.criticalChancePerMille).toBe(50);
    });

    it('should cap aggregated stats', () => {
      const equipment: PlayerEquipmentState = {
        playerId: 'player_1',
        schemaVersion: 1,
        slots: [
          { slotId: 'weapon', itemId: 'proc_sword_1', title: 'Sword', tier: 0 },
          { slotId: 'weapon2', itemId: 'proc_sword_2', title: 'Sword2', tier: 0 },
        ],
      };

      const proceduralStats = new Map([
        ['proc_sword_1', [{ key: 'attack_power', value: 80 }]],
        ['proc_sword_2', [{ key: 'attack_power', value: 80 }]],
      ]);

      const result = calculateEquipmentStats({ equipment, proceduralItemStats: proceduralStats });
      expect(result.attackPower).toBe(100); // capped at 100
    });

    it('should ignore gathering tool stats (handled elsewhere)', () => {
      const equipment: PlayerEquipmentState = {
        playerId: 'player_1',
        schemaVersion: 1,
        slots: [
          { slotId: 'woodcutting_tool', itemId: 'copper_axe', title: 'Copper Axe', tier: 2 },
        ],
      };

      const result = calculateEquipmentStats({ equipment });
      // Gathering tools don't contribute via this system
      expect(result.gatheringYield).toBe(0);
    });
  });

  describe('calculateEffectiveMagicFind', () => {
    it('should add base and equipment magic find', () => {
      expect(calculateEffectiveMagicFind(100, 50)).toBe(150);
    });

    it('should cap at maximum', () => {
      expect(calculateEffectiveMagicFind(200, 200)).toBe(300);
    });

    it('should handle zero values', () => {
      expect(calculateEffectiveMagicFind(0, 0)).toBe(0);
      expect(calculateEffectiveMagicFind(100, 0)).toBe(100);
    });
  });

  describe('calculateEffectiveGatheringYield', () => {
    it('should combine tool tier and equipment yield', () => {
      // Tier 2 tool gives +1 bonus, equipment gives +2
      expect(calculateEffectiveGatheringYield(2, 2)).toBe(4);
    });

    it('should cap at maximum', () => {
      expect(calculateEffectiveGatheringYield(5, 5)).toBe(5);
    });

    it('should handle tier 1 tool (no bonus)', () => {
      expect(calculateEffectiveGatheringYield(1, 2)).toBe(2);
    });
  });

  describe('mergeStatBlocks', () => {
    it('should add stat blocks together', () => {
      const base = createDefaultStatBlock();
      const equipment: EquipmentStatBlock = {
        attackPower: 10,
        defense: 5,
        maxHealth: 100,
        maxStamina: 50,
        magicFind: 30,
        gatheringYield: 2,
        gatheringXp: 200,
        lootQuality: 15,
        criticalChancePerMille: 25,
      };

      const result = mergeStatBlocks(base, equipment);
      expect(result.attackPower).toBe(10);
      expect(result.defense).toBe(5);
      expect(result.magicFind).toBe(30);
    });
  });
});

// ---------------------------------------------------------------------------
// CombatEquipmentHook Tests
// ---------------------------------------------------------------------------
describe('CombatEquipmentHook', () => {
  describe('calculateCombatEquipmentStats', () => {
    it('should combine base and equipment stats', () => {
      const stats = createDefaultStatBlock();
      const result = calculateCombatEquipmentStats({
        equipmentStats: { ...stats, attackPower: 15, defense: 10 },
        baseAttack: 10,
        baseDefense: 5,
      });

      expect(result.totalAttackPower).toBe(25);
      expect(result.totalDefense).toBe(15);
    });
  });

  describe('applyDefense', () => {
    it('should reduce damage by defense', () => {
      expect(applyDefense(10, 3)).toBe(7);
    });

    it('should not reduce below minimum', () => {
      expect(applyDefense(5, 10)).toBe(1);
      expect(applyDefense(5, 10, 0)).toBe(0);
    });
  });

  describe('critChancePermilleToDecimal', () => {
    it('should convert per-mille to decimal', () => {
      expect(critChancePermilleToDecimal(0)).toBe(0);
      expect(critChancePermilleToDecimal(100)).toBe(0.1);
      expect(critChancePermilleToDecimal(250)).toBe(0.25);
    });

    it('should clamp to valid range', () => {
      expect(critChancePermilleToDecimal(500)).toBe(0.25);
      expect(critChancePermilleToDecimal(-10)).toBe(0);
    });
  });

  describe('shouldCrit', () => {
    it('should return true when rng is below threshold', () => {
      expect(shouldCrit(100, 0.05)).toBe(true);  // 5% < 10%
      expect(shouldCrit(250, 0.1)).toBe(true);  // 10% < 25%
    });

    it('should return false when rng is above threshold', () => {
      expect(shouldCrit(100, 0.15)).toBe(false); // 15% >= 10%
      expect(shouldCrit(50, 0.1)).toBe(false);   // 10% >= 5%
    });
  });

  describe('calculateFinalDamage', () => {
    it('should calculate damage with attack power and defense', () => {
      const result = calculateFinalDamage({
        baseDamage: 10,
        attackPower: 5,
        defense: 3,
        rngValue: 0.5, // not a crit
        critChancePerMille: 0,
      });

      expect(result.damage).toBe(12); // (10 + 5) - 3
      expect(result.isCrit).toBe(false);
    });

    it('should apply crit multiplier', () => {
      const result = calculateFinalDamage({
        baseDamage: 10,
        attackPower: 0,
        defense: 0,
        rngValue: 0.0, // crit
        critChancePerMille: 100, // 10% crit chance
        critMultiplier: 1.75,
      });

      expect(result.isCrit).toBe(true);
      expect(result.damage).toBe(17); // floor(10 * 1.75)
    });
  });
});

// ---------------------------------------------------------------------------
// LootEquipmentHook Tests
// ---------------------------------------------------------------------------
describe('LootEquipmentHook', () => {
  describe('calculateLootEquipmentStats', () => {
    it('should combine base and equipment stats', () => {
      const stats = createDefaultStatBlock();
      const result = calculateLootEquipmentStats({
        equipmentStats: { ...stats, magicFind: 50, lootQuality: 30 },
        baseMagicFind: 100,
        baseLootQuality: 20,
      });

      expect(result.effectiveMagicFind).toBe(150);
      expect(result.effectiveLootQuality).toBe(50);
    });

    it('should cap at maximum', () => {
      const stats = createDefaultStatBlock();
      const result = calculateLootEquipmentStats({
        equipmentStats: { ...stats, magicFind: 500 },
        baseMagicFind: 0,
      });

      expect(result.effectiveMagicFind).toBe(300);
    });
  });

  describe('extendLootContextWithEquipment', () => {
    it('should extend context with equipment stats', () => {
      const baseContext = {
        playerId: 'player_1',
        tickIndex: 100,
        dropSourceId: 'npc_1',
        areaLevel: 10,
      };

      const stats = createDefaultStatBlock();
      const result = extendLootContextWithEquipment(
        baseContext,
        { ...stats, magicFind: 50 },
        0,
        0,
      );

      expect(result.magicFind).toBe(50);
      expect(result.lootQuality).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// GatheringEquipmentHook Tests
// ---------------------------------------------------------------------------
describe('GatheringEquipmentHook', () => {
  describe('calculateGatheringEquipmentStats', () => {
    it('should combine tool and equipment bonuses', () => {
      const stats = createDefaultStatBlock();
      const result = calculateGatheringEquipmentStats({
        equipmentStats: { ...stats, gatheringYield: 2, gatheringXp: 100 },
        toolTierBonus: 2,
        toolXpMultiplierPermille: 1200,
      });

      expect(result.totalYieldBonus).toBe(3); // (2-1) + 2
      expect(result.totalXpMultiplierPermille).toBeGreaterThan(1200);
    });

    it('should cap yield bonus', () => {
      const stats = createDefaultStatBlock();
      const result = calculateGatheringEquipmentStats({
        equipmentStats: { ...stats, gatheringYield: 10 },
        toolTierBonus: 5,
        toolXpMultiplierPermille: 1000,
      });

      expect(result.totalYieldBonus).toBe(GATHERING_YIELD_CAP);
    });

    it('should handle tier 1 tool', () => {
      const stats = createDefaultStatBlock();
      const result = calculateGatheringEquipmentStats({
        equipmentStats: { ...stats, gatheringYield: 1 },
        toolTierBonus: 1,
        toolXpMultiplierPermille: 1100,
      });

      expect(result.totalYieldBonus).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// LootEquipmentSlots Tests
// ---------------------------------------------------------------------------
describe('LootEquipmentSlots', () => {
  describe('getSlotForBaseType', () => {
    it('should map weapon base types', () => {
      expect(getSlotForBaseType('sword')).toBe('weapon');
      expect(getSlotForBaseType('axe')).toBe('weapon');
      expect(getSlotForBaseType('bow')).toBe('weapon');
    });

    it('should map armor base types', () => {
      expect(getSlotForBaseType('chest')).toBe('armor');
      expect(getSlotForBaseType('armor')).toBe('armor');
    });

    it('should map accessory base types', () => {
      expect(getSlotForBaseType('ring')).toBe('ring');
      expect(getSlotForBaseType('amulet')).toBe('amulet');
    });

    it('should return null for unmapped types', () => {
      expect(getSlotForBaseType('unknown_type')).toBeNull();
    });
  });

  describe('getSlotCategory', () => {
    it('should categorize slots correctly', () => {
      expect(getSlotCategory('weapon')).toBe('weapon');
      expect(getSlotCategory('armor')).toBe('armor');
      expect(getSlotCategory('ring')).toBe('accessory');
      expect(getSlotCategory('woodcutting_tool')).toBe('gathering');
    });
  });

  describe('isGatheringSlot', () => {
    it('should identify gathering slots', () => {
      expect(isGatheringSlot('woodcutting_tool')).toBe(true);
      expect(isGatheringSlot('mining_tool')).toBe(true);
      expect(isGatheringSlot('fishing_tool')).toBe(true);
    });

    it('should reject combat slots', () => {
      expect(isGatheringSlot('weapon')).toBe(false);
      expect(isGatheringSlot('armor')).toBe(false);
    });
  });

  describe('isCombatSlot', () => {
    it('should identify combat slots', () => {
      expect(isCombatSlot('weapon')).toBe(true);
      expect(isCombatSlot('armor')).toBe(true);
      expect(isCombatSlot('helmet')).toBe(true);
      expect(isCombatSlot('boots')).toBe(true);
      expect(isCombatSlot('ring')).toBe(true);
      expect(isCombatSlot('amulet')).toBe(true);
    });

    it('should reject gathering slots', () => {
      expect(isCombatSlot('woodcutting_tool')).toBe(false);
    });
  });

  describe('COMBAT_SLOT_IDS', () => {
    it('should contain all combat slots', () => {
      expect(COMBAT_SLOT_IDS).toContain('weapon');
      expect(COMBAT_SLOT_IDS).toContain('armor');
      expect(COMBAT_SLOT_IDS).toContain('helmet');
      expect(COMBAT_SLOT_IDS).toContain('boots');
      expect(COMBAT_SLOT_IDS).toContain('ring');
      expect(COMBAT_SLOT_IDS).toContain('amulet');
    });
  });
});