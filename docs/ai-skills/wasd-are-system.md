# WASD AI Knowledge: ARE System (Areloria Runtime Engine)

Purpose: Core understanding of the ARE (Areloria Runtime Engine) deterministic system.

## Overview

The ARE (Areloria Runtime Engine) is a deterministic simulation layer that ensures consistent game state across all clients and servers.

## Key Components

### Core Files

| Path | Purpose |
|------|---------|
| `server/src/are/` | ARE engine modules |
| `server/src/core/are/` | ARE core integration |
| `server/src/core/WorldTick.ts` | Main tick loop |

### ARE Types

```typescript
// ARE-Economy Snapshot
interface AREEconomySnapshot {
  l: number;      // Liquidity (calculated from gold sink + market volume + treasury)
  k: 1000;       // Constant
  r: number;     // Remainder (l % 1000)
}

// ARE Divergence Summary
interface AREDivergenceSummary {
  status: 'ok' | 'warn' | 'critical';
  samples: number;
  ok: number;
  warn: number;
  critical: number;
  maxMagnitude: number;
  latest?: AREDivergenceSample;
}

// Auto Repair Status
interface AutoRepairStatus {
  active: boolean;
  healed: boolean;
  lastPlan: AutoRepairPlan | null;
  history: AutoRepairPlan[];
}

// Deterministic Usage Stats
interface DeterministicUsageStats {
  windowTicks: number;
  samples: number;
  hashesInWindow: number;
  hashesPerMinute: number;
  latestTick: number;
  latestReason: string | null;
}
```

## ARE System Integrations

### WorldTick Integration

```typescript
import { areAutoRepairService } from '../are/AREAutoRepairService.js';
import { deterministicUsageTracker } from '../are/DeterministicUsageTracker.js';
import { AREEconomyAdapter } from './are/AREEconomyAdapter.js';

// In WorldTick.tick():
const autoRepair = areAutoRepairService.getStatus();
const usage = deterministicUsageTracker.getStats(this.tickCount);
const economySnapshot = this.economyAdapter.snapshotARE();
```

### ARE Shadow System

The ARE Shadow provides a deterministic replay layer:
- `AREShadowAdapter` - Manages shadow tick execution
- `AREShadowLogSink` - Logs shadow state to JSONL files
- `AREShadowState` - Tracks ecosystem state

### ARE Health Self-Heal

```typescript
private getSelfHealMeta(): { healState: string; anomalyScore: number; patchedSubsystems: string[] } {
  const autoRepair = areAutoRepairService.getStatus();
  const usage = deterministicUsageTracker.getStats(this.tickCount);
  
  let healState: 'healthy' | 'degraded' | 'healed' | 'quarantined' = 'healthy';
  const lastPlan = autoRepair.lastPlan;
  
  if (lastPlan && lastPlan.phase !== 'idle' && lastPlan.phase !== 'healed') {
    healState = 'degraded';
  }
  if (lastPlan && lastPlan.phase === 'healed') {
    healState = 'healed';
  }
  
  const anomalyScore = Math.min(1, (
    (usage.hashesInWindow > 0 ? 0.3 : 0) +
    (lastPlan && lastPlan.phase === 'healed' ? 0.2 : 0) +
    (this.lastAREGuardStatus && !this.lastAREGuardStatus.ok ? 0.5 : 0)
  ));
  
  return {
    healState,
    anomalyScore,
    patchedSubsystems: lastPlan && lastPlan.phase === 'healed' ? ['determinism', 'guard'] : [],
  };
}
```

## Divergence Detection

```typescript
const divSummary = this.areDivergenceGuard.summarize();
if (divSummary.status !== 'ok' || divSummary.warn > 0 || divSummary.critical > 0) {
  diverged.push('entity_group');
}
```

## Electroweak Pruning

Loot decay system:
- TTL: 1200 ticks (120 seconds)
- Decay events tracked for telemetry
- Prophecies generated for emergent events

## Common Mistakes

1. **Accessing wrong properties**: Don't use `totalGold` on `AREEconomySnapshot` - use `l`
2. **Checking wrong status fields**: Don't use `.ok`/`.repaired` on `AutoRepairStatus` - use `lastPlan.phase`
3. **Missing `.type` accessor**: Ouroboros actions are objects, not strings - use `action.type`

## Related Documentation

- `docs/MANIFEST_SYSTEM.md` - Hash chain integrity
- `docs/wiki/ARE-Logic-Core.md` - Core logic
- `docs/ai-skills/wasd-typescript-troubleshooting.md` - Type fixes