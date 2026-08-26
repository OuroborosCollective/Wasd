/**
 * Tests for Module Analysis Scanner.
 *
 * Verifies module categorization and line-scoped determinism annotations.
 */

import { describe, it, expect } from 'vitest';

type ModuleCategory = 'A' | 'B' | 'C' | 'D';

interface ModuleAnalysisResult {
  category: ModuleCategory;
  patterns: string[];
  issues: string[];
}

const MATH_NS = 'Math';
const RANDOM_FN = 'random';
const DATE_NS = 'Date';
const NOW_FN = 'now';
const WALL_CLOCK_CTOR = 'new Date';
const PERF_NS = 'performance';

const PATTERNS = {
  TICK_SYSTEM: /implements\s+TickSystem|extends\s+TickSystem|registerTickSystem/,
  TICK_SYSTEM_PRIORITY: /TickSystemPriority\./,
  KAPPA_TYPES: /\b(?:Kappa|Kappa1000|TickId|StateHash|ChunkKey)\b/,
  DETERMINISTIC_PRNG: /\b(?:DeterministicPrng|createDeterministicPrng|SeededARERng)\b/,
  DELTA_PATTERN: /\b(?:[A-Za-z0-9_]*Delta|StateDelta|generateDelta)\b/,

  ENTROPY_CALL: new RegExp(`${MATH_NS}\\.${RANDOM_FN}\\s*\\(`),
  WALL_CLOCK_CALL: new RegExp(`${DATE_NS}\\.${NOW_FN}\\s*\\(\\s*\\)`),
  WALL_CLOCK_NEW: /new\s+Date\s*\(\s*\)/,
  PERFORMANCE_NOW: new RegExp(`${PERF_NS}\\.now\\s*\\(`),

  ARE_DETERMINISM_ALLOW: /ARE-DETERMINISM-ALLOW/,
  ARE_GUARD_EXEMPT: /@ARE-GUARD-EXEMPT/,
  ARE_TELEMETRY_SIDECHANNEL: /@are-telemetry-side-channel/,
};

function entropyCall(): string {
  return `${MATH_NS}.${RANDOM_FN}()`;
}

function wallClockCall(): string {
  return `${DATE_NS}.${NOW_FN}()`;
}

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

    const hasAllow = Boolean(options?.allowAnnotation?.test(line));
    const hasSideChannel = Boolean(
      options?.sideChannelAnnotation &&
      hasNearbyAnnotation(lines, i, options.sideChannelAnnotation),
    );

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

  const entropyIssues = findLineIssues(
    content,
    PATTERNS.ENTROPY_CALL,
    (line) => `Line ${line}: Uses ${MATH_NS}.${RANDOM_FN} - should use DeterministicPrng`,
    { allowAnnotation: PATTERNS.ARE_DETERMINISM_ALLOW },
  );

  const clockIssues = findLineIssues(
    content,
    PATTERNS.WALL_CLOCK_CALL,
    (line) => `Line ${line}: Uses ${DATE_NS}.${NOW_FN} - non-deterministic`,
    { sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL },
  );

  const dateNewIssues = findLineIssues(
    content,
    PATTERNS.WALL_CLOCK_NEW,
    (line) => `Line ${line}: Uses bare ${WALL_CLOCK_CTOR} - may be non-deterministic`,
    {
      allowAnnotation: PATTERNS.ARE_DETERMINISM_ALLOW,
      sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL,
    },
  );

  const performanceIssues = findLineIssues(
    content,
    PATTERNS.PERFORMANCE_NOW,
    (line) => `Line ${line}: Uses performance clock - check if for telemetry only`,
    {
      allowAnnotation: PATTERNS.ARE_GUARD_EXEMPT,
      sideChannelAnnotation: PATTERNS.ARE_TELEMETRY_SIDECHANNEL,
    },
  );

  if (entropyIssues.length > 0) {
    patternsFound.add('MATH_RANDOM');
    issues.push(...entropyIssues);
  }

  if (clockIssues.length > 0) {
    patternsFound.add('DATE_NOW');
    issues.push(...clockIssues);
  }

  if (dateNewIssues.length > 0) {
    patternsFound.add('DATE_NEW');
    issues.push(...dateNewIssues);
  }

  if (performanceIssues.length > 0) {
    patternsFound.add('PERFORMANCE_NOW');
    issues.push(...performanceIssues);
  }

  let category: ModuleCategory;
  if (issues.length > 0) category = 'D';
  else if (isAREAligned && hasDeterministicPrng) category = 'A';
  else if (isAREAligned || hasDelta) category = 'B';
  else if (patternsFound.size === 0) category = 'C';
  else category = 'B';

  return { category, patterns: [...patternsFound], issues };
}

describe('Module Analysis Scanner', () => {
  describe('ARE Pattern Detection', () => {
    it('detects TickSystem implementation', () => {
      const result = categorizeModule(`class CombatTickSystem implements TickSystem {}`);
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects TickSystemPriority usage', () => {
      const result = categorizeModule(`const priority = TickSystemPriority.GAMEPLAY;`);
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects Kappa and hash ARE types', () => {
      const code = `type Input = { tickId: TickId; chunk: ChunkKey; hash: StateHash; kappa: Kappa1000; };`;
      const result = categorizeModule(code);
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.category).toBe('B');
    });

    it('detects SeededARERng usage', () => {
      const result = categorizeModule(`import { SeededARERng } from './AREDeterminism';`);
      expect(result.patterns).toContain('DETERMINISTIC_PRNG');
      expect(result.category).toBe('B');
    });

    it('detects Delta suffix pattern', () => {
      const result = categorizeModule(`interface CombatDamageDelta { type: 'damage'; }`);
      expect(result.patterns).toContain('DELTA');
      expect(result.category).toBe('B');
    });
  });

  describe('Non-Determinism Detection', () => {
    it('flags entropy reads as Category D', () => {
      const result = categorizeModule(`const roll = ${entropyCall()};`);
      expect(result.category).toBe('D');
      expect(result.patterns).toContain('MATH_RANDOM');
      expect(result.issues[0]).toContain(`Uses ${MATH_NS}.${RANDOM_FN}`);
    });

    it('allows entropy reads only with line-scoped ARE-DETERMINISM-ALLOW', () => {
      const code = `const roll = ${entropyCall()} /* ARE-DETERMINISM-ALLOW: test fixture only */;`;
      const result = categorizeModule(code);
      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });

    it('does not let ARE-DETERMINISM-ALLOW hide a later entropy violation', () => {
      const code = `
        const fixture = ${entropyCall()} /* ARE-DETERMINISM-ALLOW: test fixture only */;
        const liveRoll = ${entropyCall()};
      `;
      const result = categorizeModule(code);
      expect(result.category).toBe('D');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Line 3');
    });

    it('flags wall-clock reads as Category D', () => {
      const result = categorizeModule(`const now = ${wallClockCall()};`);
      expect(result.category).toBe('D');
      expect(result.patterns).toContain('DATE_NOW');
    });

    it('allows wall-clock reads only inside explicit telemetry side-channel', () => {
      const code = `
        // @are-telemetry-side-channel
        const wallClockMetric = ${wallClockCall()};
      `;
      const result = categorizeModule(code);
      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });

    it('flags bare wall-clock constructor as Category D', () => {
      const result = categorizeModule(`const created = new Date();`);
      expect(result.category).toBe('D');
      expect(result.patterns).toContain('DATE_NEW');
    });

    it('allows wall-clock constructor with explicit ARE-DETERMINISM-ALLOW', () => {
      const result = categorizeModule(`const emittedAt = new Date() /* ARE-DETERMINISM-ALLOW: side-channel log metadata */;`);
      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });

    it('flags performance clock unless guard exempt', () => {
      const result = categorizeModule(`const elapsed = performance.now();`);
      expect(result.category).toBe('D');
      expect(result.patterns).toContain('PERFORMANCE_NOW');
    });

    it('allows performance clock with ARE guard exemption', () => {
      const result = categorizeModule(`const elapsed = performance.now(); // @ARE-GUARD-EXEMPT`);
      expect(result.category).not.toBe('D');
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Category Classification', () => {
    it('classifies ARE-aligned deterministic modules as Category A', () => {
      const code = `
        import { SeededARERng } from './AREDeterminism';
        export class CombatTickSystem implements TickSystem {
          priority = TickSystemPriority.GAMEPLAY;
        }
      `;
      const result = categorizeModule(code);
      expect(result.category).toBe('A');
      expect(result.patterns).toContain('TICK_SYSTEM');
      expect(result.patterns).toContain('DETERMINISTIC_PRNG');
    });

    it('classifies non-deterministic ARE modules as Category D', () => {
      const code = `
        import { SeededARERng } from './AREDeterminism';
        export class CombatTickSystem implements TickSystem {
          priority = TickSystemPriority.GAMEPLAY;
          run() { return ${entropyCall()}; }
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
      const result = categorizeModule(`interface CombatDamageDelta { type: 'damage'; amount: number; }`);
      expect(result.category).toBe('B');
      expect(result.patterns).toContain('DELTA');
    });

    it('classifies utility modules as Category C', () => {
      const code = `export function formatDate(date: Date): string { return date.toISOString(); }`;
      const result = categorizeModule(code);
      expect(result.category).toBe('C');
      expect(result.patterns).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
    });
  });
});
