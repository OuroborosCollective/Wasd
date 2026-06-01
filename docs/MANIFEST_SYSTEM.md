# Manifest System - Server Authority Protocol

## Overview

Das Manifest-System implementiert ein deterministisches, server-authoritatives Protokoll für Areloria. Es ermöglicht:

- **Hash Chain Integrity**: Jeder Tick produziert einen kryptographisch verifizierbaren State-Hash
- **Divergence Detection**: Clients können Divergenz erkennen und Resync anfordern
- **Replay Protection**: Nonce-basiertes Replay-Angriff-Prevention
- **SelfHeal Integration**: Manifeste tracken Systemgesundheit

## Core Design Principle

> **Manifest klein halten, Funktionen drumherum stark machen.**

Das Manifest ist ein reiner Datencontainer. Die Logik (Hashing, Signing, Verification) lebt in separaten Modulen.

## Architecture

```
server/src/core/manifest/
├── ManifestTypes.ts         # Typdefinitionen (ManifestKind, PayloadMode, Dependencies)
├── ManifestCanonicalizer.ts # Deterministic stringify für Hashing
├── ManifestHasher.ts        # SHA256, Merkle-Root, Nonce-Generation
├── ManifestSigner.ts         # HMAC-SHA256 Signaturen
├── ManifestVerifier.ts      # Vollständige Validierung
├── ManifestReplayGuard.ts    # Replay-Angriff-Prevention (Ringbuffer)
├── ManifestFactory.ts        # Manifest-Erstellung mit Auto-Hashing/Signing
├── WorldTickManifestManager.ts # WorldTick-Integration
├── ManifestUsage.ts          # Integrations-Beispiele
└── Manifest.test.ts          # Unit-Tests

apps/client-2d/src/manifest/
├── ClientManifestTracker.ts  # Client-seitige Divergenz-Erkennung
├── useManifest.ts             # React Hooks für Integration
└── index.ts                  # Exports

server/src/api/
└── manifestResyncRoute.ts    # Client Resync API (/api/manifest/*)
```

## Types

### ManifestKind

```typescript
export type ManifestKind =
  | 'world_tick'    // Regular 10Hz simulation tick
  | 'snapshot'      // Full world state snapshot (periodic)
  | 'rollback'       // Authoritative rollback checkpoint
  | 'resync'         // Client divergence recovery
  | 'audit'          // Admin audit / compliance log
  | 'self_heal';     // Self-healing repair manifest
```

### PayloadMode

```typescript
export type PayloadMode =
  | 'full_snapshot' // Complete world state
  | 'delta'          // Only changes since last manifest
  | 'hash_only'      // State hash only, no payload
  | 'event_log';     // Only events, reconstructed state
```

### DependencyKind

```typescript
export type DependencyKind =
  | 'entity_group'
  | 'physics'
  | 'npc_ai'
  | 'quest'
  | 'inventory'
  | 'economy'
  | 'chunk'
  | 'asset'
  | 'ruleset'
  | 'self_heal';
```

## Crypto Dependency Header

```typescript
export interface ICryptoDependencyHeader {
  readonly protocolVersion: number;
  readonly kind: ManifestKind;

  readonly tickSequence: number;
  readonly tickRateHz: number;
  readonly simulationTimeMs: number;    // Deterministic!
  readonly serverTimestamp: number;      // Wall-clock (ops only)

  readonly worldId: string;
  readonly worldSeedHash: string;
  readonly ruleSetHash: string;

  readonly stateHash: string;
  readonly previousStateHash: string;
  readonly dependencyRootHash: string;
  readonly payloadHash: string;

  readonly authoritySignature: string;
  readonly signatureAlgorithm: 'HMAC-SHA256' | 'Ed25519' | 'RSA-PSS-SHA256';

  readonly integrityNonce: string;        // Replay-Schutz
}
```

## Genesis Constants

```typescript
export const GENESIS_STATE_HASH = '0'.repeat(64);
export const GENESIS_PREVIOUS_HASH = 'GENESIS';
```

## Usage

### Server: WorldTick Integration

```typescript
import { createWorldTickManifestManager } from './manifest';

const WORLD_ID = process.env.WORLD_ID ?? 'areloria-main';
const MANIFEST_AUTHORITY_SECRET = process.env.MANIFEST_AUTHORITY_SECRET;

class WorldTick {
  private readonly manifestManager = createWorldTickManifestManager(
    WORLD_ID,
    MANIFEST_AUTHORITY_SECRET
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

### Server: Resync Endpoint

```typescript
// POST /api/manifest/resync
{
  playerId: string,
  clientTick: number,
  clientStateHash: string
}

// Response
{
  ok: true,
  serverTick: number,
  serverStateHash: string,
  state: unknown,        // Full server state for resync
  snapshotTick: number,
  snapshotHash: string
}
```

### Client: Divergence Detection

```typescript
import { clientManifestTracker, useManifest } from './manifest';

function GameComponent() {
  const { currentTick, diverged, lastStateHash } = useManifest({
    onResyncNeeded: (result) => {
      // Call POST /api/manifest/resync
      fetch('/api/manifest/resync', {
        method: 'POST',
        body: JSON.stringify({
          playerId: getPlayerId(),
          clientTick: result.tick,
          clientStateHash: result.stateHash
        })
      });
    }
  });
  
  return diverged ? <DivergenceAlert /> : <Game />;
}
```

## Environment Variables

### Required for Production

```bash
# Generate with: openssl rand -hex 64
MANIFEST_AUTHORITY_SECRET=<generated-secret>
WORLD_ID=areloria-main
```

### Location
- `.env.example` - Development defaults
- `deploy/.env.production.template` - Production template

## Hash Chain

Every tick produces a chain:

```
Tick 0: Genesis -> stateHash_0
Tick 1: stateHash_0 -> stateHash_1
Tick 2: stateHash_1 -> stateHash_2
...
```

The state hash is computed as:

```typescript
stateHash = SHA256(dependencyRootHash | payloadHash | previousStateHash)
```

## Snapshot Strategy

- **Delta Ticks**: Every tick (10Hz) for regular updates
- **Snapshots**: Every 600 ticks (60 seconds) for resync recovery
- **SelfHeal Manifests**: When LiveHeal repairs something

## Replay Guard

```typescript
const MAX_REPLAY_CACHE_SIZE = 10000;
const MAX_TICK_GAP = 100;

const guard = new ManifestReplayGuard();

const result = guard.accept(manifest);
if (!result.accepted) {
  // Reject stale/duplicate manifests
}
```

## SelfHeal Metadata

```typescript
interface ISelfHealManifestMeta {
  healState: 'healthy' | 'degraded' | 'healed' | 'quarantined';
  anomalyScore: number;           // 0..1
  patchedSubsystems: string[];
}
```

Included in every manifest for observability.

## Client Resync Flow

1. Client receives `world_tick` with `{ manifest: { stateHash, snapshotTick } }`
2. Client tracks tick and hash via `ClientManifestTracker`
3. If tick gap > 100 or hash mismatch:
   - Call `POST /api/manifest/resync`
   - Receive full server state
   - Replace local state
   - Call `tracker.markSynchronized(tick, stateHash)`

## Testing

```bash
pnpm exec vitest run server/src/core/manifest/Manifest.test.ts
```

## Related Documentation

- `docs/wiki/Determinism.md` - Kappa, Psi Evolution, Fixed-Point
- `docs/wiki/WorldTick-and-10Hz-Simulation.md` - 10Hz Simulation
- `docs/MODULE_MANIFEST.md` - Module map