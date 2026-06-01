# WASD Manifest System Skill

## Overview

The manifest system implements deterministic, server-authoritative state management for Areloria. It creates a cryptographic hash chain where every tick produces a verifiable state hash.

## Quick Reference

### Key Files

| Path | Purpose |
|------|---------|
| `server/src/core/manifest/` | Server manifest modules |
| `apps/client-2d/src/manifest/` | Client manifest tracking |
| `server/src/api/manifestResyncRoute.ts` | Resync API |
| `docs/MANIFEST_SYSTEM.md` | Full documentation |

### Core Types

```typescript
// Manifest types
ManifestKind: 'world_tick' | 'snapshot' | 'rollback' | 'resync' | 'audit' | 'self_heal'
PayloadMode: 'full_snapshot' | 'delta' | 'hash_only' | 'event_log'
DependencyKind: 'entity_group' | 'physics' | 'npc_ai' | 'quest' | 'inventory' | 'economy' | 'chunk' | 'asset' | 'ruleset' | 'self_heal'

// Constants
GENESIS_STATE_HASH = '0'.repeat(64)
GENESIS_PREVIOUS_HASH = 'GENESIS'
```

### Environment Variables

```bash
MANIFEST_AUTHORITY_SECRET=<generated-secret>  # openssl rand -hex 64
WORLD_ID=areloria-main
```

## Common Tasks

### 1. Create a new manifest type

```typescript
import { ManifestFactory, GENESIS_STATE_HASH } from './manifest';

const factory = new ManifestFactory({
  worldId: process.env.WORLD_ID,
  worldSeedHash: GENESIS_STATE_HASH,
  ruleSetHash: GENESIS_STATE_HASH,
  authoritySecret: process.env.MANIFEST_AUTHORITY_SECRET,
  tickRateHz: 10,
});

// Delta tick
const delta = factory.createDeltaTick(tick, payload, deps);

// Snapshot
const snapshot = factory.createSnapshot(tick, fullState, deps);

// Resync
const resync = factory.createResync(tick, serverState, divergence);
```

### 2. Add dependencies to track

```typescript
import { sha256 } from './ManifestHasher';

const deps = [
  {
    componentId: 'entity_group',
    kind: 'entity_group',
    checksum: sha256(JSON.stringify({ players: count })),
    schemaVersion: 1,
    entityCount: count,
  },
  {
    componentId: 'economy',
    kind: 'economy',
    checksum: economyAdapter.snapshotARE().totalGold.toString(),
    schemaVersion: 1,
  },
];
```

### 3. Integrate with WorldTick

```typescript
import { createWorldTickManifestManager } from './manifest/WorldTickManifestManager';

class WorldTick {
  private manifestManager = createWorldTickManifestManager(
    process.env.WORLD_ID,
    process.env.MANIFEST_AUTHORITY_SECRET
  );

  private recordTickManifest(): void {
    const deps = this.buildManifestDependencies();
    
    if (this.manifestManager.shouldSnapshot(this.tickCount)) {
      this.manifestManager.createSnapshot(
        this.tickCount,
        this.buildFullState(),
        deps,
        this.getSelfHealMeta()
      );
    } else {
      this.manifestManager.createDeltaTick(this.tickCount, delta, deps);
    }
  }
}
```

### 4. Client divergence handling

```typescript
import { clientManifestTracker } from './manifest';

// In world_tick handler
window.addEventListener('wasd:network-packet', (event) => {
  const { event: type, payload } = event.detail;
  
  if (type === 'world_tick') {
    const result = clientManifestTracker.processManifest(payload);
    
    if (result.needsResync) {
      // Call resync endpoint
      fetch('/api/manifest/resync', {
        method: 'POST',
        body: JSON.stringify({
          playerId: getPlayerId(),
          clientTick: result.tick,
          clientStateHash: result.stateHash,
        }),
      }).then(r => r.json()).then(data => {
        // Apply server state
        applyState(data.state);
        clientManifestTracker.markSynchronized(data.serverTick, data.serverStateHash);
      });
    }
  }
});
```

### 5. Verify a manifest

```typescript
import { verifyManifest } from './manifest';

const result = verifyManifest(manifest, authoritySecret, previousHash);

if (!result.valid) {
  console.error('Manifest verification failed:', result.errors);
  // Handle rejection
}
```

### 6. Use replay guard

```typescript
import { globalReplayGuard } from './manifest';

const { accepted, reason } = globalReplayGuard.accept(manifest);

if (!accepted) {
  console.warn('Replay detected:', reason);
  // Reject stale manifest
}
```

## Architecture Principles

### Design: "Manifest klein halten, Funktionen drumherum stark machen"

The manifest is a **data container only**. Logic lives in companion modules:

- `ManifestCanonicalizer` - deterministic stringification
- `ManifestHasher` - SHA256 hashing
- `ManifestSigner` - HMAC signing
- `ManifestVerifier` - validation
- `ManifestReplayGuard` - replay prevention

### Hash Chain

```
Genesis -> tick1 -> tick2 -> tick3 -> ...
         stateHash stateHash stateHash
         prev=0    prev=t1   prev=t2
```

Each state hash = `SHA256(dependencyRootHash | payloadHash | previousStateHash)`

### Snapshot Strategy

- Delta ticks: Every tick (10Hz)
- Snapshots: Every 600 ticks (60 seconds)
- SelfHeal: When LiveHeal repairs system

## Troubleshooting

### "Failed to resolve import @wasd/shared"
Rebuild the shared package:
```bash
rm packages/shared/*.tsbuildinfo && pnpm -C packages/shared build
```

### "stateHash mismatch"
- Check that both server and client use same `MANIFEST_AUTHORITY_SECRET`
- Verify genesis hash is `'0'.repeat(64)`
- Check that payload canonicalization is identical

### "Replay attack detected"
- Nonce already seen - check replay guard state
- Tick regression - client may have reconnected

## Related Skills

- `wasd-monorepo-patterns` - Project structure
- `wasd-game-architecture` - Core systems
- `server-anti-ninja-loot` - Security patterns