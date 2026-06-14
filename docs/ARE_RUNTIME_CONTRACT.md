# ARE_RUNTIME_CONTRACT.md

## Overview

This is the master runtime contract for Areloria's ARE (Autonomous Reactive Engine) architecture. It defines the authoritative rules for tick-based simulation, determinism requirements, and system integration boundaries.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│              Client Runtime                 │
├─────────────────────────────────────────────┤
│           WebSocket Truth Path              │
├─────────────────────────────────────────────┤
│         WorldTick (Simulation Authority)    │
├─────────────────────────────────────────────┤
│         WorldEventBus (Event Layer)         │
├─────────────────────────────────────────────┤
│     Persistence (Side-Channel Metadata)      │
└─────────────────────────────────────────────┘
```

## Core Principles

1. **Single Source of Truth**: WorldTick is the authoritative source for simulation state
2. **Determinism**: Given same inputs + tick sequence, output MUST be identical
3. **Tick Authority**: All gameplay calculations MUST use tick-based time
4. **Side-Channel Isolation**: Observability systems MUST NOT affect simulation

## Tick Authority

### Valid Time Sources

| Source | Usage | Notes |
|--------|-------|-------|
| `tick.tickIndex` | ✅ Gameplay | Primary tick counter |
| `tick.tickTimestamp` | ✅ Gameplay | Simulation time in ms |
| `tick.worldTimeHours` | ✅ Gameplay | World clock |
| `Date.now()` | ⚠️ Persistence | Only for DB metadata |
| `performance.now()` | ❌ Forbidden | Non-deterministic |
| `Math.random()` | ❌ Forbidden | Unless seeded |

### Tick Context Provider

```typescript
// server/src/core/are/TickSystemContextProvider.ts
const context = tickContextProvider.getContext();

// Access tick authority
const tickId = context.tickId;
const tickIndex = context.tickIndex;
const worldTimeHours = context.worldTimeHours;
const tickTimestamp = context.tickTimestamp;
const seedHash = context.seedHash;
```

## Truth Path Hierarchy

### 1. Simulation Authority (WorldTick)

```
WorldTick
    │
    ├─► WorldEventBus (tick context)
    │
    ├─► StateDelta
    │
    └─► WebSocketServer
             │
             └─► Client Runtime
```

### 2. Side-Channels (Telemetry/Observability)

These MUST NOT affect simulation:

- Telemetry events
- Monitoring metrics
- Diagnostics logging
- Analytics tracking
- Health probes

## Determinism Requirements

### Hash Requirements

All simulation state that crosses trust boundaries MUST be hashable:

```typescript
interface HashableState {
  tickId: number;
  stateHash: string;  // FNV or SHA-256
  stateSnapshot: any; // Deterministic serialization
}
```

### Hash Caching

For performance, cache hashes within a tick:

```typescript
// tickHashCache[tick] stores computed hash
// Recompute only on state mutation
```

### Serialization Rules

Use deterministic serialization only:

```typescript
// ✅ CORRECT: Deterministic
JSON.stringify(state, Object.keys(state).sort());

// ❌ FORBIDDEN: Non-deterministic
JSON.stringify(state);  // Property order may vary
```

## Network Delta Hierarchy

### Preferred Pattern

```
WorldSnapshot (rare - on connect only)
    │
    └─► ChunkDelta
              │
              └─► EntityDelta
                        │
                        └─► ComponentDelta
```

### Forbidden Pattern

```typescript
// ❌ FORBIDDEN: Full snapshot every tick
function broadcast() {
  ws.broadcast({ type: 'world_snapshot', state: fullWorldState });
}

// ✅ CORRECT: Delta-based
function broadcast(delta) {
  ws.broadcast({ type: 'entity_delta', delta });
}
```

## Integration Patterns

### Registering a System

```typescript
// server/src/index.ts
import { installMySystem } from './modules/mySystem/installMySystem.js';

async function bootstrap() {
  installMySystem(tick);
}
```

### System Lifecycle

```typescript
// ✅ CORRECT: System registration
export function installMySystem(tick: WorldTick) {
  tick.on('tick', () => {
    // Receive ticks
  });
  
  return {
    stop: () => {
      // Cleanup
    }
  };
}
```

## Audit Requirements

### Pre-Merge Checks

Run all audit scripts before merging:

```bash
# Route registry validation
node scripts/audit-route-registry.mjs

# System registration validation
node scripts/audit-system-registration.mjs

# Event flow validation
node scripts/audit-event-flow.mjs
```

### Critical Patterns to Avoid

| Pattern | Risk | Detection |
|---------|------|-----------|
| `Date.now()` in gameplay | Non-determinism | grep simulation paths |
| `Math.random()` unseeded | Non-determinism | grep hot paths |
| Orphaned routes | Silent dead paths | audit-route-registry |
| Orphan events | Memory leaks | audit-event-flow |
| Unregistered systems | Phantom implementations | audit-system-registration |

## System Contracts

| Contract | File | Purpose |
|----------|------|---------|
| WEBSOCKET_TRUTH_PATH | `docs/WEBSOCKET_TRUTH_PATH.md` | Network topology |
| EVENTBUS_CONTRACT | `docs/EVENTBUS_CONTRACT.md` | Event flow rules |
| PERSISTENCE_CONTRACT | `docs/PERSISTENCE_CONTRACT.md` | State persistence |
| ROUTE_REGISTRY | `docs/ROUTE_REGISTRY.md` | API surface |

## Violation Severity

| Severity | Description | Action |
|----------|-------------|--------|
| 🔴 Critical | Breaks simulation determinism | Block merge |
| 🟠 High | Potential runtime issues | Fix before release |
| 🟡 Warning | Code smell | Fix in next sprint |
| 🟢 Info | Observational | Track only |

## References

- `docs/WEBSOCKET_TRUTH_PATH.md` - Network truth topology
- `docs/EVENTBUS_CONTRACT.md` - Event bus integration
- `docs/PERSISTENCE_CONTRACT.md` - State persistence rules
- `docs/ROUTE_REGISTRY.md` - API surface definition
- `docs/ARE_DETERMINISM_CLASSIFICATION.md` - Determinism rules
