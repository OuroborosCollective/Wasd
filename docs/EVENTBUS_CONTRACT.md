# EVENTBUS_CONTRACT.md

## Overview

This document defines the EventBus contract for Areloria's ARE architecture. It establishes event flow patterns, allowed consumers, and side-channel classification.

## EventBus Architecture

```
Ouroboros Tick System
         ↓
  WorldEventBus ← TickSystemContextProvider (tick context)
         ↓
┌────────┴────────┐
│                 │
▼                 ▼
Emitter        Consumer
```

## Implementation

| Component | File | Role |
|-----------|------|------|
| WorldEventBus | `server/src/routes/WorldEventBus.ts` | Central event bus |
| TickSystemContextProvider | `server/src/core/are/TickSystemContextProvider.ts` | Tick context injection |

## Event Types

### Ouroboros Cycle Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `PERCEIVE` | World state change | NPC Brains |
| `EVALUATE` | Decision tick | Behavior Trees |
| `ACT` | Action execution | Gameplay Systems |
| `REMEMBER` | Memory update | Memory Systems |
| `UPDATE` | State sync | Client Runtime |

### Gameplay Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `combat_kill` | Player/NPC death | Loot, Rewards |
| `level_up` | XP threshold | Stats, UI |
| `trade_complete` | Trade success | Economy |
| `quest_complete` | Quest done | Progress |

## Event Interface

```typescript
export interface WorldEvent {
  type: string;              // Event identifier
  actorId?: string;          // Source entity
  actorName?: string;        // Display name
  targetId?: string;         // Target entity
  targetName?: string;       // Target display
  position?: { x: number; y: number };  // World position
  data?: Record<string, any>; // Event payload
  intensity?: number;        // Magnitude (0-1)
  timestamp?: number;        // Tick-derived timestamp
  tickId?: number;           // Authoritative tick ID
}
```

## Side-Channel Classification

| Event Type | Classification | Notes |
|-----------|----------------|-------|
| Telemetry events | Side-channel | Metrics collection |
| Debug events | Side-channel | Development only |
| Analytics events | Side-channel | Reporting |
| Gameplay events | Truth-path | State-affecting |

### Side-Channel Rules

1. Side-channel events MUST NOT modify simulation state
2. Side-channel events MUST be clearly labeled with `channel: "telemetry"` or similar
3. Side-channel events are for observability ONLY

## Publisher Requirements

```typescript
// ✅ CORRECT: Publishing with tick context
publish(event: string, data: any): void {
  const tickContext = tickContextProvider.getContext();
  
  const worldEvent: WorldEvent = {
    type: event,
    data,
    timestamp: tickContext.tickTimestamp,
    tickId: tickContext.tickId,
  };
  
  this.notifySubscribers(worldEvent);
}

// ❌ FORBIDDEN: Publishing without tick context
publish(event: string, data: any): void {
  const worldEvent: WorldEvent = {
    type: event,
    data,
    timestamp: Date.now(),  // FORBIDDEN - not deterministic
  };
  
  this.notifySubscribers(worldEvent);
}
```

## Subscriber Requirements

```typescript
// ✅ CORRECT: Subscriber with tick awareness
subscribe(
  id: string,
  eventTypes: string[],
  callback: (event: WorldEvent) => void,
  includeTickContext = true  // Must request tick context
): void {
  // Implementation
}

// ✅ CORRECT: Processing event with tick validation
function onEvent(event: WorldEvent) {
  const currentTick = tickContextProvider.getContext();
  
  // Validate event is current
  if (event.tickId > currentTick.tickId) {
    console.warn("Future event detected");
    return;
  }
  
  processEvent(event);
}
```

## Anti-Patterns (Forbidden)

```typescript
// ❌ FORBIDDEN: Event without tick context
bus.publish("combat_kill", { actorId: "a" });  // Missing tickId

// ❌ FORBIDDEN: Side-channel as truth
function onTelemetryEvent(event: WorldEvent) {
  modifyGameState(event);  // Side-channel cannot modify state
}

// ❌ FORBIDDEN: Events affecting replay
function onEvent(event: WorldEvent) {
  if (event.timestamp > Date.now() - 1000) {
    applyEffect();  // Time-based filtering breaks determinism
  }
}
```

## Audit Criteria

Run `scripts/audit-event-flow.mjs` to detect:

| Finding | Severity | Description |
|---------|----------|-------------|
| Orphan Events | ⚠️ Warning | Events emitted but never consumed |
| Dead Subscriptions | ⚠️ Warning | Subscribed but never emitted |
| Missing Tick Context | ❌ Error | Events without `tickId` |
| Side-channel violations | ❌ Error | Side-channel modifying state |

## Event Flow Diagram

```
┌─────────────┐
│ WorldTick   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ WorldEventBus│
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│ Emitters    │  │ Consumers   │
├─────────────┤  ├─────────────┤
│ Ouroboros   │  │ NPC Brains  │
│ Combat      │  │ Loot System │
│ Economy     │  │ UI Updates  │
│ Quests      │  │ Client Sync │
└─────────────┘  └─────────────┘
```

## References

- ARE_RUNTIME_CONTRACT.md - Master runtime contract
- WEBSOCKET_TRUTH_PATH.md - Network truth path
- PERSISTENCE_CONTRACT.md - State persistence rules
