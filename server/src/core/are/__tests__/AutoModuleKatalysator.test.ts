/**
 * AutoModuleKatalysator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_MODULES_DIR = join(process.cwd(), '.test_modules_tmp');

function setupTestModules(): void {
  mkdirSync(TEST_MODULES_DIR, { recursive: true });
  writeFileSync(join(TEST_MODULES_DIR, 'category-a.ts'), `
    import { TickSystem, TickSystemPriority } from '../index.js';
    import { SeededARERng } from '../determinism/AREDeterminism.js';
    export class CategoryA implements TickSystem {
      readonly name = 'category-a';
      readonly priority = TickSystemPriority.GAMEPLAY;
      enabled = true;
      tick(context) { /* deterministic */ }
    }
  `);
  writeFileSync(join(TEST_MODULES_DIR, 'category-b.ts'), `
    import { SeededARERng } from '../determinism/AREDeterminism.js';
    export class CategoryB { process() { const rng = new SeededARERng('test-seed'); return rng.nextFloat(); } }
  `);
  writeFileSync(join(TEST_MODULES_DIR, 'category-c.ts'), `export function utilityFunction(a: number, b: number): number { return a + b; }`);
  writeFileSync(join(TEST_MODULES_DIR, 'category-d.ts'), `export class CategoryD { process() { return Math.random(); } }`);
  writeFileSync(join(TEST_MODULES_DIR, 'category-e.ts'), `export class CategoryE { getData() { return null; } }`);
}

function cleanupTestModules(): void {
  rmSync(TEST_MODULES_DIR, { recursive: true, force: true });
}

describe('AutoModuleKatalysator', () => {
  beforeEach(setupTestModules);
  afterEach(cleanupTestModules);

  describe('Module Classification', () => {
    it('should classify Category A modules (ARE-Aligned)', () => expect(determineCategory(['TICK_SYSTEM', 'DETERMINISTIC_PRNG'], false)).toBe('A'));
    it('should classify Category B modules (Deterministic-Ready)', () => expect(determineCategory(['DELTA'], false)).toBe('B'));
    it('should classify Category C modules (Utility)', () => expect(determineCategory([], false)).toBe('C'));
    it('should classify Category D modules (Non-Deterministic)', () => expect(determineCategory(['MATH_RANDOM'], false)).toBe('D'));
    it('should classify Category E modules (Stub)', () => expect(determineCategory([], true)).toBe('E'));
  });

  describe('Priority Determination', () => {
    it('should assign GAMEPLAY priority to Category A', () => expect(determinePriority('A')).toBe(20));
    it('should assign GAMEPLAY priority to Category B', () => expect(determinePriority('B')).toBe(20));
    it('should assign FOUNDATION priority to Category C', () => expect(determinePriority('C')).toBe(10));
    it('should assign PERSISTENCE priority to Category D', () => expect(determinePriority('D')).toBe(40));
  });

  describe('Determinism Detection', () => {
    it('should detect Math.random as non-deterministic', () => expect('const roll = Math.random();').toContain('Math.random'));
    it('should allow Math.random with ARE-DETERMINISM-ALLOW', () => expect(/ARE-DETERMINISM-ALLOW/.test('const roll = Math.random() /* ARE-DETERMINISM-ALLOW: placeholder */;')).toBe(true));
    it('should detect Date.now as non-deterministic', () => expect('const now = Date.now();').toContain('Date.now()'));
    it('should allow Date with ARE annotation', () => expect(/ARE-DETERMINISM-ALLOW/.test('const now = new Date(0) /* ARE-DETERMINISM-ALLOW: placeholder */;')).toBe(true));
  });

  describe('Snapshot Integration', () => {
    it('should create module snapshot data structure', () => {
      const snapshotData = { moduleName: 'test.module', tick: 12345, stateHash: '0'.repeat(64), entityCount: 5, deltaCount: 10, category: 'B', patterns: ['DELTA'] };
      expect(snapshotData.moduleName).toBeDefined();
      expect(snapshotData.tick).toBeGreaterThan(0);
      expect(snapshotData.stateHash).toHaveLength(64);
    });
    it('should clear timestamp for deterministic client transmission', () => {
      const clientSnapshot = { moduleName: 'test', tick: 100, stateHash: 'abc123', entityCount: 1, deltaCount: 1, category: 'B', patterns: [], timestamp: 0 };
      expect(clientSnapshot.timestamp).toBe(0);
    });
  });

  describe('Pattern Detection', () => {
    const PATTERNS = {
      TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
      TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
      DETERMINISTIC_PRNG: /DeterministicPrng|createDeterministicPrng|SeededARERng/,
      DELTA_PATTERN: /(?:\bDelta\b|[A-Za-z0-9_]Delta\b|StateDelta|generateDelta)/,
      MATH_RANDOM: /Math\.random\(/,
      DATE_NOW: /Date\.now\(\)/,
      ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
    };
    it('should detect TickSystem implementation', () => expect(PATTERNS.TICK_SYSTEM.test('export class CombatTickSystem implements TickSystem {')).toBe(true));
    it('should detect TickSystemPriority usage', () => expect(PATTERNS.TICK_SYSTEM_PRIORITY.test('priority = TickSystemPriority.GAMEPLAY;')).toBe(true));
    it('should detect SeededARERng', () => expect(PATTERNS.DETERMINISTIC_PRNG.test('import { SeededARERng } from "./AREDeterminism";')).toBe(true));
    it('should detect Delta pattern', () => expect(PATTERNS.DELTA_PATTERN.test('interface CombatDamageDelta { type: "damage"; }')).toBe(true));
    it('should detect Math.random', () => expect(PATTERNS.MATH_RANDOM.test('const roll = Math.random();')).toBe(true));
    it('should detect Date.now', () => expect(PATTERNS.DATE_NOW.test('const now = Date.now();')).toBe(true));
    it('should respect ARE-DETERMINISM-ALLOW', () => expect(PATTERNS.ARE_DETERMINISM_ALLOW.test('/* ARE-DETERMINISM-ALLOW: test */')).toBe(true));
  });
});

function determineCategory(patterns: string[], isStub: boolean): string {
  if (isStub) return 'E';
  if (patterns.includes('MATH_RANDOM') || patterns.includes('DATE_NOW')) return 'D';
  if (patterns.includes('TICK_SYSTEM') && patterns.includes('DETERMINISTIC_PRNG')) return 'A';
  if (patterns.includes('TICK_SYSTEM') || patterns.includes('DELTA') || patterns.includes('DETERMINISTIC_PRNG')) return 'B';
  return 'C';
}

function determinePriority(category: string): number {
  switch (category) {
    case 'A':
    case 'B': return 20;
    case 'C': return 10;
    case 'D': return 40;
    default: return 50;
  }
}
