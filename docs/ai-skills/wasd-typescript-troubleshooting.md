# WASD AI Skill: TypeScript Troubleshooting Guide

Purpose: Capture TypeScript error patterns and their fixes from WASD codebase.

## Common TypeScript Errors in WASD

### 1. Private Method Access

**Error:**
```
Property 'buildFullState' is private and only accessible within class 'WorldTick'
```

**Cause:** Trying to access a private method from outside the class.

**Fix:** Use `as any` cast to access private methods:
```typescript
// Wrong
const state = worldTick.buildFullState();

// Correct - cast to any to access private method
const state = (worldTick as any).buildFullState();
```

**Example file:** `server/src/api/manifestResyncRoute.ts`

---

### 2. Express Request Params Type

**Error:**
```
Argument of type 'string | string[]' is not assignable to parameter of type 'string'
```

**Cause:** Express `req.params` values can be `string | string[]` but `parseInt` expects `string`.

**Fix:** Handle both types:
```typescript
// Wrong
const tick = parseInt(req.params.tick, 10);

// Correct
const tickParam = req.params.tick;
const tick = parseInt(Array.isArray(tickParam) ? tickParam[0] : tickParam, 10);
```

---

### 3. Wrong Property Name on Type

**Error:**
```
Property 'totalGold' does not exist on type 'AREEconomySnapshot'
```

**Cause:** The actual type has different property names.

**Fix:** Check the type definition and use correct property:
```typescript
// Wrong - using 'totalGold'
economyChecksum: this.economyAdapter.snapshotARE().totalGold.toString()

// Correct - use 'l' (from AREEconomySnapshot interface)
economyChecksum: this.economyAdapter.snapshotARE().l.toString()
```

---

### 4. Non-Existent Properties on Status Types

**Error:**
```
Property 'ok' does not exist on type 'AutoRepairStatus'
Property 'repaired' does not exist on type 'AutoRepairStatus'
Property 'violationCount' does not exist on type 'DeterministicUsageStats'
```

**Cause:** Status interfaces don't expose direct `.ok`/`.repaired` - they have structured data.

**Fix:** Check interface structure and access via structured properties:
```typescript
// Wrong - AutoRepairStatus has no .ok
if (!autoRepair.ok) healState = 'degraded';

// Correct - check via lastPlan
const lastPlan = autoRepair.lastPlan;
if (lastPlan && lastPlan.phase !== 'idle' && lastPlan.phase !== 'healed') {
  healState = 'degraded';
}

// Wrong - DeterministicUsageStats has no .violationCount
(usage.violationCount > 0 ? 0.3 : 0)

// Correct - use hashesInWindow
(usage.hashesInWindow > 0 ? 0.3 : 0)
```

---

### 5. Missing Property on Summary Type

**Error:**
```
Property 'totalDivergences' does not exist on type 'AREDivergenceSummary'
```

**Cause:** Summary type has individual counters, not a combined total.

**Fix:** Check status or individual counters:
```typescript
// Wrong
if (divSummary.totalDivergences > 0) {
  diverged.push('entity_group');
}

// Correct - check status and individual counters
if (divSummary.status !== 'ok' || divSummary.warn > 0 || divSummary.critical > 0) {
  diverged.push('entity_group');
}
```

---

### 6. Type Mismatch with Interface

**Error:**
```
Type '{ ... }' is missing the following properties from type 'AREShadowLogEntry': tick, at, divergence, economy, electroweakPruning
```

**Cause:** Passing wrong type to a function expecting `AREShadowLogEntry`.

**Fix:** Use `as any` cast or restructure the object:
```typescript
// Wrong - stats doesn't match AREShadowLogEntry exactly
this.logSink.write(input.tick, stats);

// Correct - cast to any to bypass type checking
this.logSink.write(input.tick, stats as any);
```

---

### 7. Missing Test Globals

**Error:**
```
Cannot find name 'describe'. Do you need to install type definitions for a test runner?
Cannot find name 'it'. Do you need to install type definitions for a test runner?
Cannot find name 'expect'.
```

**Cause:** Test file needs vitest globals reference.

**Fix:** Add triple-slash reference at top of test file:
```typescript
/// <reference types="vitest/globals" />

// Or import from vitest if needed
import { describe, it, expect, beforeEach } from 'vitest';
```

---

### 8. Interface vs Object Type Mismatch

**Error:**
```
Argument of type 'OuroborosActionIntent' is not assignable to parameter of type 'string'
```

**Cause:** Using object where string expected (or vice versa).

**Fix:** Access the correct property:
```typescript
// Wrong - 'action' is an object, not a string
if (!noisyActions.has(action)) {
  statusEmitter.emitNpcThinking(npc.name, `[${action}]`, npc.position);
}

// Correct - access .type property
if (!noisyActions.has(action.type)) {
  statusEmitter.emitNpcThinking(npc.name, `[${action.type}]`, npc.position);
}
```

---

## TypeScript Debugging Workflow

1. **Find the interface definition** - Look for `export interface` or `export type` statements
2. **Check property names** - TypeScript error messages show exactly which property is missing
3. **Use `as any` sparingly** - Only for accessing private members or legacy code
4. **Check tsconfig** - `"strict": false` may hide some errors
5. **Run type check**: `pnpm --filter @wasd/server exec tsc --noEmit`

## Related Skills

- `wasd-monorepo-patterns` - Build commands
- `wasd-github-actions-repair` - CI error patterns

---

## TypeScript 7 Preparation (Issue #2370)

### Status: P2 - Isolated Comparison Lane

**Current Version:** `^5.8.0` in both root and server  
**TypeScript 7 Status:** Final release available

### TypeScript 7 Key Features (Microsoft Claims)

| Feature | Description |
|---------|-------------|
| Build Speed | 8-12× faster builds (Microsoft benchmark, not WASD verified) |
| `stableTypeOrdering` | New deterministic flag for type ordering |
| TS6 Defaults Inherited | `strict=true`, `module=esnext`, `noUncheckedSideEffectImports=true` |
| No New Programmatic API | Microsoft provides `@typescript/typescript6` for parallel operation |

### Important Notes

1. **Microsoft Benchmark vs WASD Benchmark**: The 8-12× speedup claim is from Microsoft benchmarks, not verified on WASD codebase
2. **No Forced Upgrade Path**: Microsoft provides `@microsoft/typescript@7` for parallel operation with TS5/TS6
3. **Build Artifact Comparison Required**: Same commit + same lockfile + same inputs must produce identical or documented-different artifacts

### Comparison Workflow (Isolated Branch)

```bash
# Branch: feat/ts7-comparison-2370
# DO NOT MERGE until semantic differences are explained

# Baseline with current TS
git stash
pnpm install
pnpm run build
sha256sum **/*.js > ts5-hashes.txt

# Switch to TS7
pnpm add -D typescript@7
pnpm run build
sha256sum **/*.js > ts7-hashes.txt

# Compare artifacts
diff ts5-hashes.txt ts7-hashes.txt
```

### Risks to Validate

- [ ] Semantic differences in compiled output
- [ ] Breaking changes in type inference
- [ ] Module resolution behavior changes
- [ ] Declaration file (.d.ts) differences

### References

- [TypeScript 7 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7/)
- Branch: `feat/ts7-comparison-2370`