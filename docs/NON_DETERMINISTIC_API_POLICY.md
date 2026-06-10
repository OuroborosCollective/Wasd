# Non-Deterministic API Usage Policy

## Overview

The Core Reality Alignment audit flags usage of `Math.random()`, `Date.now()`, and `performance.now()` in the core simulation path. However, some uses are acceptable for specific purposes.

## Allowed Uses (Non-Simulation)

These uses are for **observability, monitoring, and metadata**, NOT game simulation logic:

| Use Case | APIs | Reason |
|----------|------|--------|
| Performance timing | `performance.now()` | Measuring execution duration for monitoring |
| Last-update timestamps | `Date.now()` | Tracking when data was last updated for debugging |
| Client timestamps | `Date.now()` | Recording when client events were received |

## Exempt Files/Functions

The following are exempt from the non-deterministic check:

1. **AREGuard and ARE Protection** - Runtime checks for determinism violations
2. **Test files** - `__tests__`, `.test.`
3. **Assert functions** - `assertSafeInteger`
4. **Timestamp metadata** - `lastUpdate` fields for observability
5. **Performance measurement** - Timing for monitoring purposes

## Prohibited Uses (Simulation Logic)

These uses are NOT allowed in simulation logic:

| Use Case | Should Use Instead |
|----------|-------------------|
| Random number generation | `DeterministicPrng` from `@wasd/shared` |
| Time-based events | `tickCount` from simulation context |
| Unique IDs | `tickCount` + entity hash |

## Finding Violations

```bash
# Run audit with JSON output
node scripts/audit-core-reality-alignment.mjs --json

# Check specific violations
grep -rn "Math\.random\|Date\.now\|performance\.now" server/src/core/ \
  --include="*.ts" | grep -v "AREGuard\|__tests__\|ARE-DETERMINISM\|lastUpdate"
```

## Current Status

Most `Date.now()` usages in the core are for:
- `InterestGrid.lastUpdate` - Observability metadata
- `WorldTick` response timestamps - Client timing info

These are acceptable as they don't affect simulation determinism. The audit script will be updated to properly exclude observability uses.

## Adding New Uses

When adding new code that requires non-deterministic APIs:

1. **Ask first**: Is this for simulation logic or observability?
2. **If simulation**: Use `DeterministicPrng` or `tickCount`
3. **If observability**: Document why and add to exempt patterns
4. **Mark exemptions**: Use `// ARE-DETERMINISM-ALLOW: <reason>` comment