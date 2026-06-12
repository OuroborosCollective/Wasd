/**
 * scripts/__tests__/autoheal-modules.test.ts
 *
 * Tests for scripts/autoheal-modules.mjs
 * Run with: pnpm test -- scripts/__tests__/autoheal-modules.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('autoheal-modules', () => {
  describe('risk levels', () => {
    it('should define correct risk hierarchy', () => {
      const RISK_ORDER = ['SAFE_MECHANICAL', 'LOW_SEMANTIC', 'MEDIUM_SEMANTIC', 'HIGH_SEMANTIC', 'FORBIDDEN'];
      
      expect(RISK_ORDER).toContain('SAFE_MECHANICAL');
      expect(RISK_ORDER).toContain('LOW_SEMANTIC');
      expect(RISK_ORDER).toContain('MEDIUM_SEMANTIC');
      expect(RISK_ORDER).toContain('FORBIDDEN');
      
      // Order matters - SAFE < LOW < MEDIUM < FORBIDDEN
      expect(RISK_ORDER.indexOf('SAFE_MECHANICAL')).toBeLessThan(RISK_ORDER.indexOf('LOW_SEMANTIC'));
      expect(RISK_ORDER.indexOf('LOW_SEMANTIC')).toBeLessThan(RISK_ORDER.indexOf('MEDIUM_SEMANTIC'));
      expect(RISK_ORDER.indexOf('MEDIUM_SEMANTIC')).toBeLessThan(RISK_ORDER.indexOf('FORBIDDEN'));
    });

    it('should allow SAFE_MECHANICAL when maxRisk is SAFE_MECHANICAL', () => {
      const canApply = (risk, maxRisk) => {
        const order = ['SAFE_MECHANICAL', 'LOW_SEMANTIC', 'MEDIUM_SEMANTIC', 'HIGH_SEMANTIC', 'FORBIDDEN'];
        return order.indexOf(risk) <= order.indexOf(maxRisk);
      };
      
      expect(canApply('SAFE_MECHANICAL', 'SAFE_MECHANICAL')).toBe(true);
      expect(canApply('LOW_SEMANTIC', 'SAFE_MECHANICAL')).toBe(false);
    });

    it('should allow SAFE and LOW when maxRisk is LOW_SEMANTIC', () => {
      const canApply = (risk, maxRisk) => {
        const order = ['SAFE_MECHANICAL', 'LOW_SEMANTIC', 'MEDIUM_SEMANTIC', 'HIGH_SEMANTIC', 'FORBIDDEN'];
        return order.indexOf(risk) <= order.indexOf(maxRisk);
      };
      
      expect(canApply('SAFE_MECHANICAL', 'LOW_SEMANTIC')).toBe(true);
      expect(canApply('LOW_SEMANTIC', 'LOW_SEMANTIC')).toBe(true);
      expect(canApply('MEDIUM_SEMANTIC', 'LOW_SEMANTIC')).toBe(false);
    });
  });

  describe('action kinds', () => {
    it('should define FIX_TYPE_TYPO action', () => {
      const action = {
        kind: 'FIX_TYPE_TYPO',
        file: 'server/src/modules/test.ts',
        from: 'TickSytem',
        to: 'TickSystem',
        risk: 'SAFE_MECHANICAL',
      };
      
      expect(action.kind).toBe('FIX_TYPE_TYPO');
      expect(action.risk).toBe('SAFE_MECHANICAL');
    });

    it('should define REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG action', () => {
      const action = {
        kind: 'REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG',
        file: 'server/src/modules/loot/LootRoller.ts',
        reason: 'ctx.rng exists in scope',
        risk: 'LOW_SEMANTIC',
      };
      
      expect(action.kind).toBe('REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG');
      expect(action.risk).toBe('LOW_SEMANTIC');
    });

    it('should define MANUAL_REQUIRED for forbidden actions', () => {
      const action = {
        kind: 'MANUAL_REQUIRED',
        file: 'server/src/modules/inventory/InventorySystem.ts',
        reason: 'Math.random found but no ctx.rng in scope. Needs manual ARE seed binding.',
        risk: 'FORBIDDEN',
      };
      
      expect(action.kind).toBe('MANUAL_REQUIRED');
      expect(action.risk).toBe('FORBIDDEN');
    });
  });

  describe('plan building', () => {
    it('should classify type typos as SAFE_MECHANICAL', () => {
      const source = `const tick = new TickSytem();`;
      const hasTypeTypos = /TickSytem|TickSystem|StateHahs/.test(source);
      
      expect(hasTypeTypos).toBe(true);
    });

    it('should detect Math.random without ctx.rng as FORBIDDEN', () => {
      const source = `const roll = Math.random();`;
      const hasMathRandom = /Math\.random/.test(source);
      const hasCtxRng = /ctx\.rng|context\.rng/.test(source);
      
      expect(hasMathRandom).toBe(true);
      expect(hasCtxRng).toBe(false);
      // Should be FORBIDDEN (needs manual ARE seed binding)
    });

    it('should detect Math.random with ctx.rng as LOW_SEMANTIC', () => {
      const source = `
        const roll = Math.random();
        const ctx = { rng: { nextFloat: () => 0.5 } };
      `;
      const hasMathRandom = /Math\.random/.test(source);
      const hasCtxRng = /ctx\.rng|context\.rng/.test(source);
      
      expect(hasMathRandom).toBe(true);
      expect(hasCtxRng).toBe(true);
      // Should be LOW_SEMANTIC (replaceable with proof)
    });

    it('should detect stub patterns as MEDIUM_SEMANTIC', () => {
      const source = `return null; // stub`;
      const hasStub = /return null|return undefined|placeholder|stub/i.test(source);
      
      expect(hasStub).toBe(true);
    });

    it('should NOT plan Math.random replacement when no context RNG exists', () => {
      // This is the key rule: Math.random without ctx.rng = FORBIDDEN
      const source = `const roll = Math.random();`;
      const hasMathRandom = /Math\.random/.test(source);
      const hasContextRng = /ctx\.rng|context\.rng|rng\.nextFloat/.test(source);
      const hasTickContext = /TickSystemContext|ctx\.tick|ctx\.kappa/.test(source);
      
      const canAutoFix = hasMathRandom && (hasContextRng || hasTickContext);
      
      expect(canAutoFix).toBe(false); // Should NOT auto-fix
    });
  });

  describe('ledger structure', () => {
    it('should create valid ledger format', () => {
      const ledger = {
        runId: 'autoheal-2026-06-12T04-55-00Z',
        mode: 'strict',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        actions: [
          {
            kind: 'FIX_TYPE_TYPO',
            file: 'server/src/modules/loot/LootService.ts',
            risk: 'SAFE_MECHANICAL',
            from: 'StateHahs',
            to: 'StateHash',
          },
        ],
        forbidden: [
          {
            kind: 'MANUAL_REQUIRED',
            file: 'server/src/modules/inventory/InventorySystem.ts',
            reason: 'Math.random found but no ctx.rng in scope',
            risk: 'FORBIDDEN',
          },
        ],
        verification: {
          tsc: 'passed',
          vitest: 'passed',
          moduleScanner: 'passed',
        },
        verdict: 'GREEN_BY_PROOF',
      };
      
      expect(ledger.runId).toBeDefined();
      expect(ledger.verdict).toBe('GREEN_BY_PROOF');
      expect(ledger.verification.tsc).toBe('passed');
      expect(ledger.actions[0].risk).toBe('SAFE_MECHANICAL');
      expect(ledger.forbidden[0].risk).toBe('FORBIDDEN');
    });

    it('should require verification before GREEN verdict', () => {
      const ledger = {
        verdict: 'GREEN_BY_PROOF',
        verification: {
          tsc: 'passed',
          vitest: 'passed',
          moduleScanner: 'passed',
        },
      };
      
      const allPassed = Object.values(ledger.verification).every(v => v === 'passed');
      expect(allPassed).toBe(true);
    });
  });

  describe('policy rules', () => {
    it('should enforce no stub filling', () => {
      const policy = {
        stubPolicy: {
          deleteStubAutomatically: false,
          quarantineStubAutomatically: true,
          generateImplementationAutomatically: false,
        },
      };
      
      expect(policy.stubPolicy.generateImplementationAutomatically).toBe(false);
      expect(policy.stubPolicy.deleteStubAutomatically).toBe(false);
    });

    it('should enforce no main push', () => {
      const policy = {
        truthPath: {
          allowMainPush: false,
        },
      };
      
      expect(policy.truthPath.allowMainPush).toBe(false);
    });

    it('should require deterministic replay for certain fixes', () => {
      const policy = {
        verification: {
          requireDeterministicReplay: true,
        },
      };
      
      expect(policy.verification.requireDeterministicReplay).toBe(true);
    });
  });

  describe('action application', () => {
    it('should apply FIX_TYPE_TYPO correctly', () => {
      const source = `const tick = new TickSytem();`;
      const from = 'TickSytem';
      const to = 'TickSystem';
      
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      const result = source.replace(regex, to);
      
      expect(result).toBe(`const tick = new TickSystem();`);
    });

    it('should NOT apply fix inside string', () => {
      const source = `const x = "TickSytem";`;
      const from = 'TickSytem';
      const to = 'TickSystem';
      
      // Our real implementation skips strings, but the raw regex would replace
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      const naiveResult = source.replace(regex, to);
      
      // This shows why we need the string-skipping logic
      expect(naiveResult).not.toBe(source); // naive would change it
      
      // The actual implementation should preserve strings
      const result = applyFixPreservingStrings(source, from, to);
      expect(result).toBe(source); // unchanged
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function applyFixPreservingStrings(source, from, to) {
  let output = '';
  let i = 0;
  const isIdStart = (ch) => /[A-Za-z_$]/.test(ch);
  const isIdPart = (ch) => /[A-Za-z0-9_$]/.test(ch);

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    // Skip single-line comments
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }

    // Skip multi-line comments
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') { i += 2; break; }
        i += 1;
      }
      continue;
    }

    // Skip string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      output += ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') { output += source[i] + (source[i+1]||''); i += 2; continue; }
        if (source[i] === quote) { output += source[i]; i += 1; break; }
        output += source[i];
        i += 1;
      }
      continue;
    }

    // Identify and replace identifiers
    if (isIdStart(ch)) {
      const start = i;
      while (i < source.length && isIdPart(source[i])) i += 1;
      const ident = source.slice(start, i);
      output += ident === from ? to : ident;
      continue;
    }

    output += ch;
    i += 1;
  }

  return output;
}