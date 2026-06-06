# WASD AI Knowledge: Deterministic Persistence Engine

Purpose: Guide for working with the new PersistenceManager and ARE-deterministic persistence.

## Overview

Die `PersistenceManager` Klasse ist der deterministische Persistence-Schutzkern für die 10Hz-Ouroboros-Engine. Sie ersetzt die alte Facade-Implementierung.

**Kernprinzip**: WorldTick berechnet. Persistence archiviert. Persistence entscheidet niemals die Welt.

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    PersistenceManager                        │
├─────────────────────────────────────────────────────────────┤
│  writeBarrier    ───► Verhindert parallele Writes           │
│  logicalIndex    ───► Tick-korrekte Zuordnung               │
│  canonicalize()  ───► Deterministische JSON-Sortierung      │
│  sha256 hash     ───► Hash-Skip bei identischen Saves       │
│  timeout         ───► Verhindert Backend-Blockierung         │
│  retry           ───► Fängt kurze DB/File-Aussetzer ab      │
│  queueDepth       ───► Schutz gegen Save-Spam               │
│  deepFreeze      ───► Verhindert Mutation geladener Daten    │
│  Envelope        ───► Version, Hash, Driver, Zeit, Payload   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  IPersistenceBackend                         │
│  (File | Postgres | Redis)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### PersistenceManager (server/src/core/PersistenceManager.ts)

**Hauptmethoden:**

```typescript
// Idempotenter Init - mehrere Systeme dürfen parallel aufrufen
await persistence.init();

// Health Snapshot für Watchdog/Monitor
const health = await persistence.getHealth();
// { driver, initialized, connected, queueDepth, lastSuccessfulSaveAt, lastError, lastHash }

// Deterministischer Snapshot-Save
await persistence.saveSnapshot(logicalIndex, { player: "test" });

// Legacy-kompatibel (intern saveSnapshot mit logicalIndex=0)
await persistence.save({ player: "test" });

// Generisches Load mit Envelope-Erkennung
const loaded = await persistence.load();

// WorldObject-Save mit Sortierung (logicalIndex → type → id)
await persistence.saveWorldObjects(objects, logicalIndex);

// Tick-basierte Persistenz-Entscheidung
if (persistence.shouldPersistTick(logicalIndex, 10)) {
  // Speichere alle 10 Ticks = 1x pro Sekunde
}

// Fire-and-forget für 10Hz Tick (blockiert NICHT)
persistence.persistWorldObjectsAsync(objects, logicalIndex);
```

### IPersistenceBackend Interface

```typescript
interface IPersistenceBackend {
  readonly name: string;
  init(): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Save/Load mit readonly Typen
  save(data: Readonly<Record<string, unknown>>): Promise<void>;
  load(): Promise<Record<string, unknown>>;
  
  // WorldObjects mit readonly arrays
  saveWorldObjects(objects: readonly Readonly<Record<string, unknown>>[]): Promise<void>;
  loadWorldObjects(): Promise<Record<string, unknown>[]>;
}
```

## Usage Patterns

### Pattern 1: 10Hz Tick Integration

```typescript
import { PersistenceManager, type WorldObjectSnapshot } from "../core/PersistenceManager.js";

const persistence = new PersistenceManager();
await persistence.init();

let logicalIndex = 0;

function tick(worldObjects: readonly WorldObjectSnapshot[]): void {
  logicalIndex++;
  
  // Simulation läuft IMMER weiter
  // Persistence blockiert NIEMALS den Tick
  
  // Speichere alle 10 Ticks (1x pro Sekunde)
  if (persistence.shouldPersistTick(logicalIndex, 10)) {
    persistence.persistWorldObjectsAsync(worldObjects, logicalIndex);
  }
}
```

### Pattern 2: Kritische Events sofort speichern

```typescript
// Bei Loot, Trade, Inventar, Gebäude, Tod, Quest-Fortschritt
await persistence.saveSnapshot(logicalIndex, {
  kind: "critical-event",
  eventType: "player-trade",
  actorId: "player_1",
  targetId: "player_2",
  itemId: "iron_sword_001",
});
```

### Pattern 3: Health Monitoring

```typescript
async function checkPersistenceHealth(): Promise<PersistenceHealth> {
  const health = await persistence.getHealth();
  
  if (!health.connected) {
    console.error("[Persistence] Backend disconnected!");
  }
  
  if (health.queueDepth > 32) {
    console.warn(`[Persistence] Queue backup: ${health.queueDepth}`);
  }
  
  if (health.lastError) {
    console.error(`[Persistence] Last error: ${health.lastError}`);
  }
  
  return health;
}
```

### Pattern 4: Event-Sourcing (fortgeschritten)

```typescript
// Snapshots alle 1-5 Sekunden
// + Critical Events sofort
// = Deterministische Wiederherstellung

const SNAPSHOT_INTERVAL = 50; // Alle 5 Sekunden (50 Ticks)

if (persistence.shouldPersistTick(logicalIndex, SNAPSHOT_INTERVAL)) {
  await persistence.saveSnapshot(logicalIndex, {
    kind: "world-snapshot",
    tick: logicalIndex,
    players: getPlayerStates(),
    worldObjects: getWorldObjectStates(),
  });
}

// Bei Crash: Lade letzten Snapshot + replay Events
```

## Envelope-Format

Jeder Save erzeugt ein Envelope mit:

```typescript
{
  schemaVersion: number,    // 1 (konfigurierbar)
  logicalIndex: number,     // Tick-Index für Zuordnung
  savedAtUnixMs: number,   // Timestamp
  driver: string,          // "file" | "postgres" | "redis"
  hash: string,            // SHA-256 des canonical payload
  payload: T               // Der eigentliche Daten
}
```

## Backends

| Backend | Datei | WorldObjects | Status |
|---------|-------|--------------|--------|
| File | filePersistenceBackend.ts | ❌ | ✅ Produktiv |
| Postgres | postgresPersistenceBackend.ts | ✅ | ✅ Produktiv |
| Redis | redisPersistenceBackend.ts | ✅ | ✅ Produktiv |

## Best Practices

### DO ✅

```typescript
// 1. Immer init() vor Save aufrufen
await persistence.init();
await persistence.saveSnapshot(tick, data);

// 2. Fire-and-forget für häufige Ticks
persistence.persistWorldObjectsAsync(objects, tick);

// 3. Health prüfen nach fehlgeschlagenen Ops
const health = await persistence.getHealth();
if (health.lastError) { /* retry logic */ }

// 4. readonly Daten verwenden
await backend.save(data as Readonly<Record<string, unknown>>);

// 5. logicalIndex immer mitgeben
await persistence.saveSnapshot(tick, { /* data */ });
```

### DON'T ❌

```typescript
// 1. NIEMALS synchronous save im Tick
await persistence.save(data); // Blockiert den Tick!

// 2. NIEMALS Logik in Persistence
persistence.calculatePlayerLevel(); // ❌

// 3. NIEMALS Date.now() für kritische Logik
// (Date.now() nur für Telemetrie, nicht für Game-State)

// 4. NIEMALS Mutation nach Load
const data = await persistence.load();
data.modified = true; // ❌ - Daten sind frozen!
```

## Testing

Tests für PersistenceManager:

```bash
pnpm vitest run server/src/tests/PersistenceManager.test.ts
```

Tests für Backends:

```bash
pnpm vitest run server/src/tests/persistence-backend.test.ts
```

## Troubleshooting

### "write queue overflow"

**Cause**: Zu viele parallele Writes, queueDepth > maxQueueDepth (64)

**Fix**: 
```typescript
const persistence = new PersistenceManager(backend, {
  maxQueueDepth: 128, // Erhöhen
});
```

### "operation timed out"

**Cause**: Backend zu langsam (> 5000ms default)

**Fix**:
```typescript
const persistence = new PersistenceManager(backend, {
  operationTimeoutMs: 10_000, // Erhöhen
});
```

### "canonicalize: invalid number"

**Cause**: `Infinity` oder `NaN` im Payload

**Fix**: Vor dem Save prüfen:
```typescript
if (!Number.isFinite(value)) {
  value = 0; // Oder throw
}
```

## Related Documentation

- `server/src/core/PersistenceManager.ts` - Hauptimplementierung
- `server/src/modules/persistence/persistenceBackend.ts` - Interface
- `server/src/modules/persistence/filePersistenceBackend.ts` - File Backend
- `server/src/modules/persistence/postgresPersistenceBackend.ts` - Postgres Backend
- `server/src/modules/persistence/redisPersistenceBackend.ts` - Redis Backend
- `docs/PROJECT_STATUS_2026.md` - Aktueller Stand