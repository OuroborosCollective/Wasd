/**
 * Tests for Module Analysis Scanner
 *
 * Verifies the module analysis scanner correctly categorizes modules
 * and detects ARE-aligned patterns without allowing fake green paths.
 */

import { describe, it, expect } from 'vitest';

type ModuleCategory = 'A' | 'B' | 'C' | 'D';

interface ModuleAnalysisResult {
  category: ModuleCategory;
  patterns: string[];
  issues: string[];
}

const PATTERNS = {
  TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
  TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
  KAPPA_TYPES: /\b(?:Kappa|Kappa1000|TickId|StateHash|ChunkKey)\b/,
  DETERMINISTIC_PRNG: /\b(?:DeterministicPrng|createDeterministicPrng|SeededARERng)\b/,
  DELTA_PATTERN: /\b(?:Delta|StateDelta|generateDelta)\b/,

  MATH_RANDOM: /Math\.random\s*\(/,
  DATE_NOW_ACTUAL: /Date\.now\s*\(\s*\)/,
  DATE_NEW_BARE: /new\s+Date\s*\(\s*\)/,
  PERFORMANCE_NOW: /performance\.now\s*\(/,

  ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
  ARE_GUARD_EXEMPT: /@ARE-GUARD-EXEMPT/,
  ARE_TELEMETRY_SIDECHANNEL: /@are-telemetry-side-channel/,
};

function normalizeLines(content: string): string[] {
  return content.replace(/\r\n/g, '\n').split('\n');
}

function hasNearbyAnnotation(lines: string[], lineIndex: number, annotation: RegExp): boolean {
  const currentLine = lines[lineIndex] ?? '';
  const previousLine = lines[lineIndex - 1] ?? '';

  return annotation.test(currentLine) || annotation.test(previousLine);
}

function findLineIssues(
  content: string,
  matcher: RegExp,
  issueFactory: (line: number, source: string) => string,
  options?: {
    allowAnnotation?: RegExp;
    sideChannelAnnotation?: RegExp;
  },
): string[] {
  const lines = normalizeLines(content);
  const issues: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!matcher.test(line)) continue;

    const hasAllow =
      options?.allowAnnotation &&
      hasNearbyAnnotation(lines, i, options.allowAnnotation);

    const hasSideChannel =
      options?.sideChannelAnnotation &&
      hasNearbyAnnotation(lines, i, options.sideChannelAnnotation);

    if (hasAllow || hasSideChannel) continue;

    issues.push(issueFactory(i + 1, line.trim()));
  }

  return issues;
}

function categorizeModule(content: string): ModuleAnalysisResult {
  const patternsFound = new Set<string>();
  const issues: string[] = [];

  const isAREAligned =
    PATTERNS.TICK_SYSTEM.test(content) ||
    PATTERNS.TICK_SYSTEM_PRIORITY.test(content) ||
    PATTERNS.KAPPA_TYPES.test(content);

  const hasDeterministicPrng = PATTERNS.DETERMINISTIC_PRNG.test(content);
  const hasDelta = PATTERNS.DELTA_PATTERN.test(content);

  if (isAREAligned) patternsFound.add('TICK_SYSTEM');
  if (hasDeterministicPrng) patternsFound.add('DETERMINISTIC_PRNG');
  if (hasDelta) patternsFound.add('DELTA');

  const mathRandomIssues = findLineIssues(
    content,
    PATTERNS.MATH_RANDOM,
    (line) => `Line ${line}: Uses Math.random - should use DeterministicPrng`,
    {
      allowAnnotation: PATTERNS.ARE_DETERMINISM_ALLOW,
    },
  );

  const dateNowIssues = findLineIssues(
    content,
    PATTERNS.DATE_NOW_ACTUAL,
    (line) => `Line ${line}: Uses Date.now() - non-deterministic`,
    {
      sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL,
    },
  );

  const dateNewIssues = findLineIssues(
    content,
    PATTERNS.DATE_NEW_BARE,
    (line) => `Line ${line}: Uses bare new Date() - may be non-deterministic`,
    {
      allowAnnotation: PATTERNS.ARE_DETERMINISM_ALLOW,
      sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL,
    },
  );

  const performanceNowIssues = findLineIssues(
    content,
    PATTERNS.PERFORMANCE_NOW,
    (line) => `Line ${line}: Uses performance.now() - check if for telemetry only`,
    {
      allowAnnotation: PATTERNS.ARE_GUARD_EXEMPT,
      sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL,
    },
  );

  if (mathRandomIssues.length > 0) {
    patternsFound.add('MATH_RANDOM');
    issues.push(...mathRandomIssues);
  }

  if (dateNowIssues.length > 0) {
    patternsFound.add('DATE_NOW');
    issues.push(...dateNowIssues);
  }

  if (dateNewIssues.length > 0) {
    patternsFound.add('DATE_NEW');
    issues.push(...dateNewIssues);
  }

  if (performanceNowIssues.length > 0) {
    patternsFound.add('PERFORMANCE_NOW');
    issues.push(...performanceNowIssues);
  }

  let category: ModuleCategory;

  if (issues.length > 0) {
    category = 'D';
  } else if (isAREAligned && hasDeterministicPrng) {
    category = 'A';
  } else if (isAREAligned || hasDelta) {
    category = 'B';
  } else if (patternsFound.size === 0) {
    category = 'C';
  } else {
    category = 'B';
  }

  return {
    category,
    patterns: [...patternsFound],
    issues,
  };
}

describe('Module Analysis Scanner', () => {
  describe('ARE Pattern Detection', () => {
    it('detects TickSystem implementation', () => {
      const code = `export class CombatTickSystem implements TickSystem {}`;
      const result = categorizeModule(code);

      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects TickSystemPriority usage', () => {
      const code = `const priority = TickSystemPriority.GAMEPLAY;`;
      const result = categorizeModule(code);

      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects Kappa and hash ARE types', () => {
      const code = `
        type Input = {
          tickId: TickId;
          chunk: ChunkKey;
          hash: StateHash;
          kappa: Kappa1000;
        };
      `;

      const result = categorizeModule(code);

      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects SeededARERng usage', () => {
      const code = `import { SeededARERng } from './AREDeterminism';`;
      const result = categorizeModule(code);

      expect(result.patterns).toContain('DETERMINISTIC_PRNG');
      expect(result.category).toBe('B');
    });

    it('detects Delta pattern', () => {
      const code = `interface CombatDamageDelta { type: 'damage'; }`;
      const result = categorizeModule(code);

      expect(result.patterns).toContain('DELTA');
      expect(result.category).toBe('B');
    });
  });

  describe('Non-Determinism Detection', () => {
    it('flags Math.random as Category D', () => {
      const code = `const roll = Math.random();`;
      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('MATH_RANDOM');
      expect(result.issues[0]).toContain('Uses Math.random');
    });

    it('allows Math.random only with line-scoped ARE-DETERMINISM-ALLOW', () => {
      const code = `const roll = Math.random() /* ARE-DETERMINISM-ALLOW: test fixture only */;`;
      const result = categorizeModule(code);

      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });

    it('does not let ARE-DETERMINISM-ALLOW hide a later Math.random violation', () => {
      const code = `
        const fixture = Math.random() /* ARE-DETERMINISM-ALLOW: test fixture only */;
        const liveRoll = Math.random();
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Line 3');
    });

    it('flags Date.now() as Category D', () => {
      const code = `const now = Date.now();`;
      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('DATE_NOW');
      expect(result.issues[0]).toContain('Uses Date.now()');
    });

    it('allows Date.now() only inside explicit telemetry side-channel', () => {
      const code = `
        // @are-telemetry-side-channel
        const wallClockMetric = Date.now();
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('C');
      expect(result.issues).toHaveLength(0);
    });

    it('flags bare new Date() without annotation', () => {
      const code = `const now = new Date();`;
      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('DATE_NEW');
      expect(result.issues[0]).toContain('bare new Date()');
    });

    it('allows bare new Date() with line-scoped ARE-DETERMINISM-ALLOW', () => {
      const code = `const now = new Date() /* ARE-DETERMINISM-ALLOW: serialization fixture */;`;
      const result = categorizeModule(code);

      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });

    it('does not flag deterministic new Date(0)', () => {
      const code = `const epoch = new Date(0);`;
      const result = categorizeModule(code);

      expect(result.category).toBe('C');
      expect(result.issues).toHaveLength(0);
    });

    it('flags performance.now() without ARE exemption', () => {
      const code = `const start = performance.now();`;
      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('PERFORMANCE_NOW');
      expect(result.issues[0]).toContain('performance.now()');
    });

    it('allows performance.now() with ARE-GUARD-EXEMPT on previous line', () => {
      const code = `
        // @ARE-GUARD-EXEMPT: telemetry timing only
        const start = performance.now();
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('C');
      expect(result.issues).toHaveLength(0);
    });

    it('allows performance.now() inside telemetry side-channel', () => {
      const code = `
        // @are-telemetry-side-channel
        const start = performance.now();
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('C');
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Category Classification', () => {
    it('classifies ARE-aligned modules with deterministic PRNG as Category A', () => {
      const code = `
        import { SeededARERng } from './AREDeterminism';

        export class CombatTickSystem implements TickSystem {
          priority = TickSystemPriority.GAMEPLAY;

          run(tickId: TickId, chunkKey: ChunkKey, stateHash: StateHash) {
            const rng = new SeededARERng(String(tickId) + chunkKey + stateHash);
            return rng.nextInt(1000);
          }
        }
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('A');
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.patterns).toContain('DETERMINISTIC_PRNG');
      expect(result.issues).toHaveLength(0);
    });

    it('downgrades ARE-aligned module to Category D when non-determinism exists', () => {
      const code = `
        import { SeededARERng } from './AREDeterminism';

        export class CombatTickSystem implements TickSystem {
          priority = TickSystemPriority.GAMEPLAY;

          run() {
            return Math.random();
          }
        }
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.patterns).toContain('DETERMINISTIC_PRNG');
      expect(result.patterns).toContain('MATH_RANDOM');
      expect(result.issues).toHaveLength(1);
    });

    it('classifies deterministic-ready delta modules as Category B', () => {
      const code = `interface CombatDamageDelta { type: 'damage'; amount: number; }`;
      const result = categorizeModule(code);

      expect(result.category).toBe('B');
      expect(result.patterns).toContain('DELTA');
    });

    it('classifies utility modules as Category C', () => {
      const code = `
        export function formatDate(date: Date): string {
          return date.toISOString();
        }
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('C');
      expect(result.patterns).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Truth Path Guardrails', () => {
    it('does not accept global fake allow comments as truth-path exemption', () => {
      const code = `
        // ARE-DETERMINISM-ALLOW: fake global exemption must not greenwash the file

        export class LootTickSystem implements TickSystem {
          run() {
            return Date.now();
          }
        }
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('D');
      expect(result.patterns).toContain('DATE_NOW');
      expect(result.issues[0]).toContain('Uses Date.now()');
    });

    it('keeps telemetry separated from deterministic ARE runtime logic', () => {
      const code = `
        export class ProductionTickSystem implements TickSystem {
          run(tickId: TickId) {
            return { tickId, delta: [] };
          }
        }

        // @are-telemetry-side-channel
        const wallClockMetric = performance.now();
      `;

      const result = categorizeModule(code);

      expect(result.category).toBe('B');
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.issues).toHaveLength(0);
    });
  });
});
