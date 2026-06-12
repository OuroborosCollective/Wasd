# WASD AutoHeal System

## Overview

The AutoHeal system is an autonomous ARE module repair catalyst that operates on strict proof-first principles. It is NOT a "magic fix-bot" — it only repairs what is mechanically provable, and everything requiring semantic invention is proposed as a PR, not auto-applied.

**Core principle:** Green only through proof, not through comments.

---

## Architecture

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/analyze-modules.mjs` | Scanner: read truth, classify modules |
| `scripts/autofix-modules.mjs` | Safe mechanical fixes (type typos, category typos) |
| `scripts/autoheal-modules.mjs` | Plan builder + executor with risk levels |
| `scripts/autoheal-policy.json` | Autonomy rules for AutoHeal |

### Generated Artifacts

| File | Purpose |
|------|---------|
| `server/src/modules/module-categories.generated.json` | Scanner metadata (472 modules classified) |
| `server/src/modules/autoheal-ledger.json` | Patch ledger with verification proof |

---

## Risk Levels

| Level | Auto-apply? | Examples |
|-------|-------------|----------|
| `SAFE_MECHANICAL` | ✅ Yes | Type typos (TickSytem→TickSystem), category typos, ESM import extensions |
| `LOW_SEMANTIC` | ⚠️ With proof | Math.random replacement only when `ctx.rng` exists in scope |
| `MEDIUM_SEMANTIC` | ❌ PR only | Stub quarantine, telemetry marking |
| `HIGH_SEMANTIC` | ❌ PR only | Requires manual review |
| `FORBIDDEN` | ❌ Never | Stub filling, gameplay logic invention |

---

## Pipeline

```
1. Scan       → pnpm modules:scan:ci
2. Classify    → A/B/C/D/E categories
3. HealPlan    → pnpm autoheal:plan
4. Risk        → Filter by max-risk level
5. Apply       → pnpm autoheal:apply (only SAFE_MECHANICAL by default)
6. Verify      → tsc, vitest, scanner
7. Ledger      → autoheal-ledger.json with verdict
8. PR          → On verification success
```

---

## Package Scripts

```bash
# Phase 1: Scanner
pnpm modules:scan           # Verbose scan
pnpm modules:scan:ci        # CI mode, fail on D,E

# Phase 2: Safe Autofix
pnpm modules:fix:dry       # Dry-run autofix + manifest
pnpm modules:fix           # Write mode
pnpm modules:fix:headers    # + category headers

# Phase 3: Plan
pnpm autoheal:plan          # Build heal plan
pnpm autoheal:plan:verbose  # Verbose output

# Phase 4: Apply
pnpm autoheal:apply         # SAFE_MECHANICAL only
pnpm autoheal:apply:low     # Up to LOW_SEMANTIC
```

---

## Module Categories

| Category | Name | Description |
|----------|------|-------------|
| A | ARE_ALIGNED | Implements TickSystem correctly |
| B | DETERMINISTIC_READY | Game logic present, needs ARE wrapping |
| C | UTILITY_LOW_RISK | Math/Date utilities, make deterministic |
| D | NON_DETERMINISTIC | Uses Date.now(), Math.random(), etc. |
| E | STUB_FAKE | Placeholder or stub code |

---

## Type Typo Dictionary

AutoHeal fixes these known typos automatically (SAFE_MECHANICAL):

```
TickSytem → TickSystem
TickSysten → TickSystem
Ticksystem → TickSystem
TickContex → TickSystemContext
Kapa → Kappa
KappaPositon → KappaPosition
TickID → TickId
StateHahs → StateHash
Chunkkey → ChunkKey
DeterministicPRNG → DeterministicPrng
Worldtick → WorldTick
```

Category typo fixes:
```
ARE_ALINGED → ARE_ALIGNED
DETERMINSTIC_READY → DETERMINISTIC_READY
STUB_FAKEE → STUB_FAKE
```

---

## Hard Rules

### AutoHeal MAY do (without confirmation):
- Fix known type typos (exact dictionary match)
- Normalize category spelling typos
- Write generated manifest
- Correct ESM import extensions (.ts → .js)
- Set type-only imports (if tsc stays green)

### AutoHeal MUST NOT do:
- Replace `Date.now()` blindly
- Replace `Math.random()` without existing `ctx.rng`
- Fill stubs with fake logic
- Force category D to become green artificially
- Push directly to main
- Create fake snapshots

### Math.random Rule

```typescript
// ALLOWED: Math.random with existing ctx.rng → auto-fix
const roll = Math.random();
const ctx = { rng: { nextFloat: () => 0.5 } };
// AutoHeal may replace: const roll = ctx.rng.nextFloat();

// FORBIDDEN: Math.random without seed → FORBIDDEN action
const roll = Math.random();
// No ctx.rng in scope → Must create PR with TODO
// Cannot become green without manual ARE seed binding
```

---

## Policy Configuration

`scripts/autoheal-policy.json`:

```json
{
  "version": 1,
  "mode": "strict",
  "autonomy": {
    "maxLevel": 4,
    "writeGeneratedManifest": true,
    "createBranch": true,
    "createPullRequest": true,
    "directCommitToMain": false
  },
  "safeFixes": {
    "typeNameTypos": true,
    "categoryTypos": true,
    "esmImportExtensions": true,
    "generatedManifest": true
  },
  "determinismFixes": {
    "replaceMathRandomOnlyWithExistingContextRng": true,
    "allowNewSeedCreation": false
  },
  "stubPolicy": {
    "deleteStubAutomatically": false,
    "quarantineStubAutomatically": true,
    "generateImplementationAutomatically": false
  }
}
```

---

## Ledger Format

Every AutoHeal run produces a ledger:

```json
{
  "runId": "autoheal-2026-06-12T04-55-00Z",
  "mode": "strict",
  "filesChanged": [
    {
      "path": "server/src/modules/loot/LootService.ts",
      "actions": [
        {
          "kind": "TYPE_TYPO_FIX",
          "from": "StateHahs",
          "to": "StateHash",
          "line": 18,
          "risk": "SAFE_MECHANICAL"
        }
      ]
    }
  ],
  "verification": {
    "tsc": "passed",
    "vitest": "passed",
    "moduleScanner": "passed",
    "deterministicReplay": "passed"
  },
  "verdict": "GREEN_BY_PROOF"
}
```

---

## Usage by AI Agent

When working with WASD codebase:

1. **Before modifying ARE modules**, run `pnpm modules:scan` to understand current state
2. **After fixes**, run `pnpm modules:fix` to apply safe mechanical fixes
3. **For larger refactors**, use `pnpm autoheal:plan --verbose` to see full heal plan
4. **Apply only safe fixes**: `pnpm autoheal:apply`
5. **Verify changes**: Run `pnpm modules:scan:ci` to ensure no new D/E categories

---

## Current State (472 modules)

- A (ARE-Aligned): 2 modules
- B (Deterministic-Ready): 100 modules
- C (Utility): 262 modules
- D (Non-Deterministic): 3 modules
- E (Stub/Fake): 105 modules

---

## Integration Points

### CI Gate
```yaml
# In CI workflow
- run: pnpm modules:scan:ci
  # Fails if any D or E categories detected
```

### Pre-commit Hook
```bash
pnpm modules:fix:dry && pnpm modules:scan:ci
```

### MiniMax Agent Integration
AutoHeal is designed to be called by the MiniMax-M2.7 autonomous agent for:
- System health monitoring
- ARELogic determinism verification
- NPC civilization health checks
- UI/UX optimization
- Autonomous bug fixing via PR

---

## Best Practices

1. **Always run scanner before and after** changes
2. **Use --dry-run first** to see what would change
3. **Never bypass the risk matrix** — if action is FORBIDDEN, it stays FORBIDDEN
4. **Keep ledger** — it proves the fix is legitimate
5. **Category E stubs are OK** — do not try to auto-fill them
6. **Determinism requires proof** — no Replay = no Green

---

## Related Documentation

- `docs/ai-skills/wasd-are-system.md` — ARE engine types and integrations
- `docs/ai-skills/wasd-monorepo-patterns.md` — Build commands and workspace patterns
- `docs/MANIFEST_SYSTEM.md` — Manifest system design
- `docs/MiniMax-Autonomous-Agent.md` — MiniMax agent integration