# Areloria Codex Engine

Tags: `home`, `are`, `determinism`, `2d`, `tick-system`, `wiki`
Status: `living-index`

> The living knowledge base of a deterministic browser MMORPG engine.

```text
Kein Snapshot, kein Spiel.
Kein Tick, keine Wahrheit.
Kein Guard, keine Architektur.
Kein /2d Proof, keine Integration.
```

---

## Current canonical truth

Areloria uses a 2D-first, server-authoritative, deterministic runtime path.

```text
client intent
→ server validation
→ deterministic TickSystem
→ canonical delta
→ replay/state hash
→ SnapshotComposer or runtime manifest
→ /2d observer rendering
→ guard/test/wiki proof
```

Old `WorldTick.ts` language in historical docs should be interpreted as legacy compatibility unless a current file explicitly says otherwise. New systems must target `WorldTickScheduler`, `TickSystemRegistry`, snapshot/replay sinks, and `/2d` proof.

---

## Core architecture map

| Layer | Canonical anchor | Meaning |
| --- | --- | --- |
| Core types | `server/src/core/are/types.ts` | Kappa, TickId, StateHash, ChunkKey |
| Kappa math | `server/src/core/are/Kappa.ts` | integer fixed-point truth |
| Scheduler | `server/src/core/are/WorldTickScheduler.ts` | thin logical stepping |
| Registry | `server/src/core/are/TickSystemRegistry.ts` | ordered deterministic systems |
| Brain | `server/src/core/are/WorldBrainTickSystem.ts` | 13-layer brain as subsystem |
| Route tick context | `server/src/core/are/TickSystemContextProvider.ts` | deterministic HTTP route tick context |
| Spatial contract | `server/src/core/spatial/UnifiedChunkContract.ts` | simulation/broadcast radii and chunk truth |
| Snapshot | `server/src/core/are/SnapshotComposer.ts` | server output truth |
| Replay | `server/src/core/are/AREReplayBuffer.ts` | reconstructable mutation evidence |
| Persistence | write-behind queue | side effect, not simulation truth |

---

## Must-read project rules

| Page | Purpose |
| --- | --- |
| [[ARE Core Reality Standard|ARE-Core-Reality-Standard]] | Current technical constitution |
| [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] | New scheduler/registry interpretation |
| [[Determinism]] | Determinism guardrails |
| [[Systems Architecture|Systems_Architecture]] | System-level map |
| [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]] | Stitch and asset pipeline |
| [[ARE Logic Core|ARE-Logic-Core]] | ARE rule layer |

Repository docs synced into the wiki also include:

```text
docs/ARELORIA_CODE_TRUTH_MANIFEST_2026_06.md
docs/ARE_MODULE_IMPLEMENTATION_STANDARD.md
docs/AGENT_ARE_SKILL_PLAYBOOK.md
docs/CONVERSATION_ARCHIVE_SYNTHESIS_2026_06.md
docs/CONVERSATION_DERIVED_PROJECT_RULES_2026_06.md
```

---

## Runtime proof path

A feature is not considered integrated until it is visible or verifiable through one of these channels:

```text
/2d live client
server-authoritative snapshot
runtime asset manifest
deterministic replay/state hash
CI guard/test/smoke proof
```

Detached demos and one-off preview pages are useful only as prototypes. They are not production proof.

---

## Wiki automation

This wiki is built from repository documentation.

```text
README.md / docs/*.md / docs/wiki/*.md / scripts/wiki/**
→ scripts/wiki/build-autonomous-wiki.mjs
→ .wiki-build
→ scripts/sync-wiki.mjs
→ GitHub wiki
```

The sync must build first and sync second. Copying only `docs/wiki/**` is not enough because the generated wiki depends on README, docs, module maps and package metadata.

---

## See also

- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]]
- [[ARE Core Reality Standard|ARE-Core-Reality-Standard]]
- [[Determinism]]
- [[Implementation Map|Implementation-Map]]
- [[Glossary]]

Status: Living Wiki | Last Sync: Auto-generated
