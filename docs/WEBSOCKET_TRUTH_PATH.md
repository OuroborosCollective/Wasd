# WEBSOCKET_TRUTH_PATH.md

**⚠️ Important**: This document describes the canonical WebSocket truth path based on static analysis of the codebase. It does not represent validated runtime behavior. Runtime validation requires integration tests and live probes.

## Overview

This document defines the canonical WebSocket truth path for Areloria's ARE (Autonomous Reactive Engine) architecture. All realtime gameplay state propagation MUST flow through this path.

## Canonical Truth Path

```
WorldTick
    ↓
StateDelta
    ↓
WebSocketServer
    ↓
Client Runtime
```

This is the ONLY authorized path for gameplay truth transport.

## Implementation Details

### Server-Side Components

| Component | File | Role |
|-----------|------|------|
| WebSocketServer | `server/src/networking/WebSocketServer.ts` | Core transport layer |
| State Broadcast | Built-in | Entity sync, game events |

### Transport Protocol

```typescript
// Connection endpoint
/ws

// Message types (truth-path)
- COLLECTIVE_PEER_JOINED
- COLLECTIVE_PEER_LEFT
- entity_sync          // Gameplay state delta
- game_event           // Combat, skills, etc.

// NOT truth-path (side-channel only)
// These messages must NOT affect gameplay state
```

## Side-Channel Classification

The following WebSocket transports are explicitly **side-channels**:

| Purpose | Classification | Notes |
|---------|---------------|-------|
| Telemetry | Side-channel | Metrics, monitoring |
| Monitoring | Side-channel | Debug, health |
| Metrics | Side-channel | Performance data |
| Diagnostics | Side-channel | Error reporting |

### Side-Channel Rules

1. Side-channel messages MUST NOT modify gameplay state
2. Side-channel messages MUST be clearly labeled with a `channel` field
3. Client runtime MUST ignore side-channel messages for state authority

## Anti-Patterns (Forbidden)

```typescript
// ❌ FORBIDDEN: Direct state mutation via WebSocket
socket.on('message', (data) => {
  const msg = JSON.parse(data);
  gameState.modify(msg); // ABSOLUTELY FORBIDDEN
});

// ❌ FORBIDDEN: Alternate truth transport
function cheatTransport(msg) {
  // No alternate gameplay truth path allowed
}

// ❌ FORBIDDEN: Side-channel as truth
function onTelemetry(msg) {
  applyToGameState(msg); // Side-channel cannot be truth
}
```

## Client Runtime Requirements

The client runtime MUST:

1. **Accept only** entity_sync and game_event messages as authoritative
2. **Ignore** all other message types for state authority
3. **Validate** message integrity (checksum if available)
4. **Reconcile** local state with server delta

## Audit Criteria

The following conditions indicate a violation:

- [ ] Route exists but not mounted → Dead path
- [ ] Client references unmounted endpoint → Dead client reference
- [ ] Side-channel modifies gameplay state → Truth-path violation
- [ ] Multiple truth-path transports → Fragmentation risk

## Integration Points

### WorldTick → WebSocketServer

```typescript
// ServerBootstrap.ts creates the binding
const ws = new GameWebSocketServer(httpServer);

// Tick system emits state
tick.on('tick', () => {
  const delta = computeStateDelta(tick.currentState);
  ws.broadcast({ type: 'entity_sync', delta });
});
```

### WebSocketServer → Client

```typescript
// Broadcasts to all connected clients
ws.broadcast({ type: 'entity_sync', delta });

// Throttled per-client based on GameConfig.stateBroadcastIntervalMs
```

## Monitoring

Monitor these metrics to detect path violations:

- `ws.messages.truth_path.count`
- `ws.messages.side_channel.count`
- `ws.state_divergence.ms`
- `ws.dead_references.count`

## References

- ARE_RUNTIME_CONTRACT.md - Master runtime contract
- EVENTBUS_CONTRACT.md - Event bus integration
- PERSISTENCE_CONTRACT.md - State persistence rules
