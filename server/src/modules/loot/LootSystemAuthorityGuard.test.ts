import { describe, expect, it } from 'vitest';
import { createLegacyLootSystemForMigration, LootSystem } from './LootSystem.js';

describe('LootSystem legacy quarantine', () => {
  it('blocks direct runtime construction to prevent parallel loot truth', () => {
    expect(() => new LootSystem()).toThrow(/legacy_loot_system_disabled/);
  });

  it('allows explicit migration/test construction only', () => {
    const system = createLegacyLootSystemForMigration('test');
    expect(system.rollFromTable('missing-table')).toEqual({ items: [], gold: 0 });
  });
});
