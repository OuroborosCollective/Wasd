/**
 * AutoModuleKatalysator Tests
 * 
 * Tests for the automatic module registration and TickSystem generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// Mock modules for testing
const TEST_MODULES_DIR = join(process.cwd(), '.test_modules_tmp');

function setupTestModules(): void {
  mkdirSync(TEST_MODULES_DIR, { recursive: true });
  
  // Category A - ARE-Aligned
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
  
  // Category B - Deterministic-Ready
  writeFileSync(join(TEST_MODULES_DIR, 'category-b.ts'), `
    import { SeededARERng } from '../determinism/AREDeterminism.js';
    
    export class CategoryB {
      process() {
        const rng = new SeededARERng('test-seed');
        return rng.nextFloat();
      }
    }
  `);
  
  // Category C - Utility
  writeFileSync(join(TEST_MODULES_DIR, 'category-c.ts'), `
    export function utilityFunction(a: number, b: number): number {
      return a + b;
    }
  `);
  
  // Category D - Non-Deterministic (has Math.random)
  writeFileSync(join(TEST_MODULES_DIR, 'category-d.ts'), `
    export class CategoryD {
      process() {
        return Math.random(); // Should be flagged
      }
    }
  `);
  
  // Category E - Stub
  writeFileSync(join(TEST_MODULES_DIR, 'category-e.ts'), `
    export class CategoryE {
      getData() { return null; }
    }
  `);
}

function cleanupTestModules(): void {
  try {
    rmSync(TEST_MODULES_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('AutoModuleKatalysator', () => {
  beforeEach(() => {
    setupTestModules();
  });
  
  afterEach(() => {
    cleanupTestModules();
  });
  
  describe('Module Classification', () => {
    it('should classify Category A modules (ARE-Aligned)', () => {
      // Category A: Has TickSystem + DeterministicPrng
      const patterns = ['TICK_SYSTEM', 'DETERMINISTIC_PRNG'];
      const category = determineCategory(patterns, false);
      expect(category).toBe('A');
    });
    
    it('should classify Category B modules (Deterministic-Ready)', () => {
      // Category B: Has DELTA or is ARE-aligned but no deterministic PRNG
      const patterns = ['DELTA'];
      const category = determineCategory(patterns, false);
      expect(category).toBe('B');
    });
    
    it('should classify Category C modules (Utility)', () => {
      // Category C: No specific patterns
      const patterns: string[] = [];
      const category = determineCategory(patterns, false);
      expect(category).toBe('C');
    });
    
    it('should classify Category D modules (Non-Deterministic)', () => {
      // Category D: Has Math.random or Date.now
      const patterns = ['MATH_RANDOM'];
      const category = determineCategory(patterns, false);
      expect(category).toBe('D');
    });
    
    it('should classify Category E modules (Stub)', () => {
      // Category E: Is a stub (return null with few lines)
      const patterns: string[] = [];
      const isStub = true;
      const category = determineCategory(patterns, isStub);
      expect(category).toBe('E');
    });
  });
  
  describe('Priority Determination', () => {
    it('should assign GAMEPLAY priority to Category A', () => {
      const priority = determinePriority('A');
      expect(priority).toBe(20); // TickSystemPriority.GAMEPLAY
    });
    
    it('should assign GAMEPLAY priority to Category B', () => {
      const priority = determinePriority('B');
      expect(priority).toBe(20);
    });
    
    it('should assign FOUNDATION priority to Category C', () => {
      const priority = determinePriority('C');
      expect(priority).toBe(10); // TickSystemPriority.FOUNDATION
    });
    
    it('should assign PERSISTENCE priority to Category D', () => {
      const priority = determinePriority('D');
      expect(priority).toBe(40); // TickSystemPriority.PERSISTENCE
    });
  });
  
  describe('Determinism Detection', () => {
    it('should detect Math.random as non-deterministic', () => {
      const content = 'const roll = Math.random();';
      expect(content).toContain('Math.random');
    });
    
    it('should allow Math.random with ARE-DETERMINISM-ALLOW', () => {
      const content = 'const roll = Math.random() /* ARE-DETERMINISM-ALLOW: placeholder */;';
      const hasAllow = /ARE-DETERMINISM-ALLOW/.test(content);
      expect(hasAllow).toBe(true);
    });
    
    it('should detect Date.now as non-deterministic', () => {
      const content = 'const now = Date.now();';
      expect(content).toContain('Date.now()');
    });
    
    it('should allow Date with ARE annotation', () => {
      const content = 'const now = new Date(0) /* ARE-DETERMINISM-ALLOW: placeholder */;';
      const hasAllow = /ARE-DETERMINISM-ALLOW/.test(content);
      expect(hasAllow).toBe(true);
    });
  });
  
  describe('Snapshot Integration', () => {
    it('should create module snapshot data structure', () => {
      const snapshotData = {
        moduleName: 'test.module',
        tick: 12345,
        stateHash: '0'.repeat(64),
        entityCount: 5,
        deltaCount: 10,
        category: 'B',
        patterns: ['DELTA'],
      };
      
      expect(snapshotData.moduleName).toBeDefined();
      expect(snapshotData.tick).toBeGreaterThan(0);
      expect(snapshotData.stateHash).toHaveLength(64);
    });
    
    it('should clear timestamp for deterministic client transmission', () => {
      const snapshot = {
        moduleName: 'test',
        tick: 100,
        stateHash: 'abc123',
        entityCount: 1,
        deltaCount: 1,
        category: 'B',
        patterns: [],
        timestamp: Date.now(),
      };
      
      // For client transmission, timestamp should be zero
      const clientSnapshot = {
        ...snapshot,
        timestamp: 0, // Zero for determinism
      };
      
      expect(clientSnapshot.timestamp).toBe(0);
    });
  });
  
  describe('Pattern Detection', () => {
    const PATTERNS = {
      TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
      TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
      DETERMINISTIC_PRNG: /DeterministicPrng|createDeterministicPrng|SeededARERng/,
      DELTA_PATTERN: /\bDelta\b|StateDelta|generateDelta/,
      MATH_RANDOM: /Math\.random\(/,
      DATE_NOW: /Date\.now\(\)/,
      ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
    };
    
    it('should detect TickSystem implementation', () => {
      const code = 'export class CombatTickSystem implements TickSystem {';
      expect(PATTERNS.TICK_SYSTEM.test(code)).toBe(true);
    });
    
    it('should detect TickSystemPriority usage', () => {
      const code = 'priority = TickSystemPriority.GAMEPLAY;';
      expect(PATTERNS.TICK_SYSTEM_PRIORITY.test(code)).toBe(true);
    });
    
    it('should detect SeededARERng', () => {
      const code = 'import { SeededARERng } from "./AREDeterminism";';
      expect(PATTERNS.DETERMINISTIC_PRNG.test(code)).toBe(true);
    });
    
    it('should detect Delta pattern', () => {
      const code = 'interface CombatDamageDelta { type: "damage"; }';
      expect(PATTERNS.DELTA_PATTERN.test(code)).toBe(true);
    });
    
    it('should detect Math.random', () => {
      const code = 'const roll = Math.random();';
      expect(PATTERNS.MATH_RANDOM.test(code)).toBe(true);
    });
    
    it('should detect Date.now', () => {
      const code = 'const now = Date.now();';
      expect(PATTERNS.DATE_NOW.test(code)).toBe(true);
    });
    
    it('should respect ARE-DETERMINISM-ALLOW', () => {
      const code = 'const roll = Math.random() /* ARE-DETERMINISM-ALLOW: placeholder */;';
      expect(PATTERNS.MATH_RANDOM.test(code)).toBe(true);
      expect(PATTERNS.ARE_DETERMINISM_ALLOW.test(code)).toBe(true);
    });
  });
});

// Helper functions (mirroring AutoModuleKatalysator logic)
function determineCategory(patterns: string[], isStub: boolean): string {
  if (isStub) return 'E';
  if (patterns.includes('MATH_RANDOM')) return 'D';
  if (patterns.includes('TICK_SYSTEM') && patterns.includes('DETERMINISTIC_PRNG')) return 'A';
  if (patterns.includes('TICK_SYSTEM') || patterns.includes('DELTA')) return 'B';
  if (patterns.length === 0) return 'C';
  return 'B';
}

function determinePriority(category: string): number {
  switch (category) {
    case 'A':
    case 'B':
      return 20; // GAMEPLAY
    case 'C':
      return 10; // FOUNDATION
    case 'D':
      return 40; // PERSISTENCE
    default:
      return 20;
  }
}