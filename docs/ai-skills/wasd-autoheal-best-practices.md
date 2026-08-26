# WASD AutoHeal Best Practices

## Core Philosophy

AutoHeal follows a strict "proof before green" principle:

> **Green only through proof, not through comments.**

An action is only considered successful if:
1. TypeScript compiles (`tsc --noEmit`)
2. Tests pass (`vitest`)
3. Module scanner shows no new D/E categories
4. Deterministic replay confirms consistency (when required)

---

## Risk-Based Decision Matrix

| Action | Risk Level | Auto-apply? | Condition |
|--------|------------|-------------|-----------|
| Type typo fix (dictionary) | SAFE_MECHANICAL | ✅ Yes | Exact match in TYPE_TYPO_FIXES |
| Category typo fix | SAFE_MECHANICAL | ✅ Yes | Exact match in CATEGORY_TYPO_FIXES |
| ESM import extension | SAFE_MECHANICAL | ✅ Yes | Target file exists |
| Type-only import | SAFE_MECHANICAL | ✅ Yes | tsc stays green after |
| Manifest update | SAFE_MECHANICAL | ✅ Yes | Always generated |
| Category header insert | SAFE_MECHANICAL | ✅ Optional | Only with --headers flag |
| Math.random → ctx.rng | LOW_SEMANTIC | ⚠️ With proof | ctx.rng exists in scope |
| Date.now in telemetry | LOW_SEMANTIC | ⚠️ With proof | @are-telemetry-side-channel present |
| Stub quarantine | MEDIUM_SEMANTIC | ❌ PR | Always requires manual review |
| Math.random without seed | FORBIDDEN | ❌ Never | No auto-fix possible |
| Stub filling | FORBIDDEN | ❌ Never | Never invent logic |
| Gameplay logic | FORBIDDEN | ❌ Never | Always require human |
| Direct main push | FORBIDDEN | ❌ Never | Branch + PR only |

---

## Workflow Patterns

### Pattern 1: Safe Mechanical Fix

```bash
# 1. Scan current state
pnpm modules:scan

# 2. Apply safe fixes (dry-run first)
pnpm modules:fix:dry

# 3. If good, apply
pnpm modules:fix

# 4. Verify no regressions
pnpm modules:scan:ci
```

### Pattern 2: Type Typo Fix

```bash
# AutoHeal handles this automatically
# Just run the autofix
pnpm modules:fix

# Types it fixes:
# - TickSytem → TickSystem
# - StateHahs → StateHash
# - Kapa → Kappa
```

### Pattern 3: Determinism Fix (LOW_SEMANTIC)

```bash
# 1. Plan what would be done
pnpm autoheal:plan --verbose

# 2. Check if ctx.rng exists in target file
# AutoHeal only applies if proof exists

# 3. Apply (only SAFE_MECHANICAL by default)
pnpm autoheal:apply

# 4. For LOW_SEMANTIC with proof:
pnpm autoheal:apply:low

# 5. Verify
pnpm modules:scan:ci
```

### Pattern 4: Category D/E Handling

```bash
# Category D (Non-Deterministic) - needs manual ARE seed binding
# Do NOT auto-fix Math.random without ctx.rng

# Category E (Stub/Fake) - do NOT fill with fake logic
# Instead: quarantine via PR

# Run scanner to identify
pnpm modules:scan

# For each D category file:
# 1. Create issue with "Needs ARE seed binding"
# 2. Or create PR with TODO

# For each E category file:
# 1. Create issue with "Stub detected - do not auto-fill"
# 2. Or create PR with quarantine recommendation
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Never replace Math.random blindly

```typescript
// WRONG - AutoHeal would mark this FORBIDDEN
const roll = Math.random();

// Better approach:
// 1. Check if ctx.rng exists
// 2. If not, create PR with TODO: "Needs ARE seed binding"
// 3. Never make it green artificially
```

### ❌ Never fill stubs with fake logic

```typescript
// WRONG - This is FORBIDDEN
function getPlayer() {
  // AutoHeal would quarantine this, NOT fill it
  return { name: 'FakePlayer', level: 1 }; // Don't do this!
}

// CORRECT:
// Leave as stub, create issue:
// "InventorySystem stub detected - needs real backend implementation"
```

### ❌ Never mark Category D as green artificially

```typescript
// WRONG - This creates fake green
// @are-module-category A  ← Don't force this!
function getTime() {
  return Date.now(); // Still non-deterministic!
}
```

### ❌ Never push directly to main

```bash
# WRONG
git push origin feature/my-fix  # If feature/my-fix has AutoHeal changes

# CORRECT
git push origin feature/autoheal-my-fix
# Then create PR, let CI verify
```

---

## Verification Checklist

Before any AutoHeal run is considered successful:

- [ ] `pnpm exec tsc --noEmit` passes
- [ ] `pnpm test` passes (or appropriate subset)
- [ ] `pnpm modules:scan:ci` shows no new D/E categories
- [ ] Ledger exists at `server/src/modules/autoheal-ledger.json`
- [ ] Ledger verdict is `GREEN_BY_PROOF` or `VERIFICATION_FAILED` (never fake)
- [ ] All applied actions have corresponding verification entries

---

## Policy Configuration Guide

### strict mode (default)

```json
{
  "mode": "strict",
  "truthPath": {
    "allowMocks": false,
    "allowFakeSnapshots": false,
    "allowStubGreen": false,
    "allowMainPush": false
  }
}
```

### relaxed mode (for testing only)

```json
{
  "mode": "relaxed",
  "truthPath": {
    "allowMocks": true,
    "allowFakeSnapshots": true,
    "allowStubGreen": true,
    "allowMainPush": false
  }
}
```

**Never use relaxed mode in production.**

---

## AutoHeal by Example

### Example 1: TickSytem typo

**Before:**
```typescript
export class CombatTickSystem implements TickSytem {
  tick(ctx: TickContex) {}
}
```

**After (auto-fixed):**
```typescript
export class CombatTickSystem implements TickSystem {
  tick(ctx: TickSystemContext) {}
}
```

**Risk:** SAFE_MECHANICAL ✅

---

### Example 2: Math.random with ctx.rng

**Before:**
```typescript
class LootRoller {
  roll(ctx: TickSystemContext) {
    const roll = Math.random(); // Bad!
    return this.lootTable[roll * 100];
  }
}
```

**AutoHeal Decision:**
- Math.random detected: YES
- ctx.rng exists: YES (ctx has rng)
- Risk: LOW_SEMANTIC (requires replay proof)

**After:**
```typescript
class LootRoller {
  roll(ctx: TickSystemContext) {
    const roll = ctx.rng.nextFloat(); // Deterministic!
    return this.lootTable[roll * 100];
  }
}
```

**Verification:**
```bash
# Run deterministic replay
node scripts/autoheal-replay.mjs

# Verify hash matches
# Ledger verdict: GREEN_BY_PROOF
```

---

### Example 3: Math.random without ctx.rng (FORBIDDEN)

**Before:**
```typescript
function getRandomPlayer() {
  const roll = Math.random(); // No ctx available!
  return players[roll * players.length];
}
```

**AutoHeal Decision:**
- Math.random detected: YES
- ctx.rng exists: NO
- Risk: FORBIDDEN

**Output:**
```
FORBIDDEN:
- server/src/modules/player/PlayerSelector.ts:
  Math.random found but no ctx.rng in scope.
  Needs manual ARE seed binding.
```

**Correct Action:**
- Create issue: "Needs ARE seed binding"
- Or create PR with TODO comment
- Do NOT auto-fix

---

### Example 4: Stub detected

**Before:**
```typescript
class InventorySystem {
  getInventory(playerId: string) {
    return null; // Stub
  }
}
```

**AutoHeal Decision:**
- Stub pattern detected: YES (return null, short file)
- Category: E (STUB_FAKE)
- Risk: FORBIDDEN for filling

**Output:**
```
FORBIDDEN:
- server/src/modules/gameplay/InventorySystem.ts:
  Category E stub detected - do NOT auto-fill with fake logic
```

**Correct Action:**
- Leave stub as-is
- Create issue: "InventorySystem stub detected - needs real implementation"
- Or create PR with quarantine recommendation

---

## MiniMax Agent Integration

The AutoHeal system is designed to be called by the MiniMax-M2.7 agent:

```yaml
# In minimax-autonomous-agent.yml
triggers:
  - name: are_health_check
    command: pnpm modules:scan:ci
    on_fail: autoheal:plan

  - name: determinism_check
    command: node scripts/check-determinism.mjs
    on_fail: autoheal:apply:low
```

---

## Troubleshooting

### "No safe mechanical fixes found"

This is normal! AutoHeal only acts on:
1. Known type typos in dictionary
2. Known category typos in dictionary
3. ESM import extensions

If you expected fixes but got none:
- Check if typos are in the dictionary
- Check if files actually have the issues
- Run `pnpm autoheal:plan --verbose` for details

### "Verification failed"

Check the ledger:
```bash
cat server/src/modules/autoheal-ledger.json
```

Look at `verification` section:
```json
{
  "verification": {
    "tsc": "failed",  // ← Which check failed?
    "vitest": "passed",
    "moduleScanner": "passed"
  },
  "verdict": "VERIFICATION_FAILED"
}
```

Fix the failing check before retrying.

### "FORBIDDEN action detected"

This is correct behavior for:
- Math.random without ctx.rng
- Stubs that shouldn't be filled
- Gameplay logic that needs human review

Do NOT try to bypass FORBIDDEN actions. Create issues or PRs instead.

---

## Related Documentation

- `docs/ai-skills/wasd-autoheal-system.md` — Full system documentation
- `docs/ai-skills/wasd-are-system.md` — ARE engine types
- `docs/ai-skills/wasd-monorepo-patterns.md` — Build commands
- `docs/MANIFEST_SYSTEM.md` — Manifest system
- `docs/MiniMax-Autonomous-Agent.md` — MiniMax agent