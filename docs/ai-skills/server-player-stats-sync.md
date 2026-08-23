# WASD AI Skill: Server-Side Player Stats Sync

Purpose: Implement server-authoritative XP/level tracking and broadcast to client UI.

## Architecture: Read-Only Stats Axiom

**The client NEVER calculates authoritative XP or levels locally.** All progression truth comes from the server.

```text
SERVER (Authoritative)          CLIENT (Read-Only)
─────────────────────           ───────────────────
SkillProgressionService             Skill/Character UI
    ↓                                      ↑
AREUnboundedProgression                 Render only
    ↓                                      ↑
Exact decimal-string snapshot       Receive snapshot
    ↓                                      ↑
Gameplay events / persistence ─────────────┘
```

## Endless progression invariant

Arelorian skill progression has **no level cap**. `99`, `999999`, `Number.MAX_SAFE_INTEGER`, UI width, storage type, or a legacy safety constant must never become gameplay ceilings.

The canonical progression owner is:

- `server/src/core/determinism/AREUnboundedProgression.ts`

Canonical state uses exact integers:

```typescript
interface AREUnboundedProgressionState {
  totalXp: bigint;
  level: bigint;
  xpIntoLevel: bigint;
}
```

BigInt is never serialized directly. Persistence and network snapshots expose exact values as canonical base-10 strings such as:

```json
{
  "xpExact": "900719925474099200000",
  "levelExact": "1000000000000000001",
  "xpIntoLevelExact": "42"
}
```

Legacy `number` fields remain read-model/compatibility projections only. `numberProjectionExact=false` means callers MUST use the exact string fields for authoritative interpretation.

## Canonical XP curve

The historical Arelorian curve is retained without floating-point truth:

```text
XP(level -> level+1) = floor(50 * level^1.4)
```

The runtime evaluates the same curve exactly as integer arithmetic:

```text
floor((50^5 * level^7)^(1/5))
```

The fifth root is computed with deterministic integer binary search. This avoids `Math.pow`, floating overflow, and artificial maximum levels in progression truth.

Known values:

```text
level 1 -> 2:  50 XP
level 2 -> 3: 131 XP
level 3 -> 4: 232 XP
```

## Live skill runtime

The primary runtime path is:

```text
gameplay event
  -> SkillProgressionService
  -> SkillProgressionStore
  -> applySkillXp
  -> AREUnboundedProgression
  -> schema-2 persistence
  -> gameplay snapshot
```

Relevant files:

- `server/src/skills/SkillTypes.ts`
- `server/src/skills/SkillProgressionStore.ts`
- `server/src/skills/SkillProgressionService.ts`
- `server/src/skills/SkillPersistence.ts`
- `server/src/skills/JsonSkillPersistenceAdapter.ts`
- `server/src/skills/PgSkillPersistenceAdapter.ts`
- `server/src/routes/gameplaySnapshot.ts`

`PlayerStatsDirector` and the compatibility `modules/skill/SkillSystem` use the same exact curve/core. They may expose different skill ID sets, but they may not invent a second progression formula or cap.

## Persistence schema

Skill persistence schema version is **2**.

Schema 1 number-only rows remain readable. Hydration deterministically reconstructs exact progression state from legacy total XP and the next successful save writes schema 2.

PostgreSQL stores skill snapshots inside the existing `skills_json JSONB` payload; exact values are decimal strings, so no numeric database ceiling is introduced by the migration.

## XP event rules

- XP mutation is server-authoritative.
- XP deltas are positive safe integers at the event boundary.
- Accumulated progression truth immediately becomes bigint-backed exact state.
- XP-delta ordering uses binary string comparison, not locale-sensitive collation.
- Applying `400 + 600 XP` must produce the same canonical state as applying `1000 XP`.
- Crossing level 99 or level 999999 is a normal transition, not an exceptional state.

## UI rules

- Clients render snapshots only.
- Exact decimal-string fields are the long-horizon source of truth.
- Number projections may be used while `numberProjectionExact === true`.
- UI formatting must never clamp, wrap, truncate into a different value, or silently reinterpret an exact level as a Number.

## Verification

The Safe Test Lab explicitly executes regressions for:

- stateless keyed randomness,
- endless exact progression,
- schema-1 -> schema-2 migration,
- SkillProgressionStore,
- PlayerStatsDirector,
- legacy SkillSystem compatibility,
- XP delta ordering,
- WorldHashSnapshot strength,
- deterministic event identity/order.

Unit tests prove pure rules only. Runtime/deployment truth still requires the normal revision-bound deployment and runtime readback; a green unit test does not by itself prove production activation.
