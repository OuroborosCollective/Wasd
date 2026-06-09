# Start here: Arelorian documentation map

This page is the recommended entry point for reading the Arelorian / WASD documentation.

The repository contains current docs and older historical notes. Use this map to find the current material first.

## First read

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview and quick start |
| `AGENTS.md` | Repository working guide |
| `docs/PROJECT_STATUS_2026.md` | Current project snapshot |
| `docs/ROADMAP_TO_RELEASE.md` | Release path and remaining gaps |
| `docs/ARELORIAN_PROJECT_KNOWLEDGE_BASE.md` | Durable project knowledge and recurring rules |

## Architecture

| Document | Purpose |
|----------|---------|
| `docs/FILE_MAP.md` | Practical repository layout |
| `docs/MODULE_MANIFEST.md` | Active module map |
| `LOGIC_DOCUMENTATION.md` | Short architecture reference |
| `docs/CLIENT_ARCHITECTURE.md` | Client structure |
| `docs/NETWORKING_MODEL.md` | Synchronization model |
| `game-data/AUTHORING_GUIDE.md` | Game content authoring |

## Current project rules

| Document | Purpose |
|----------|---------|
| `docs/ARELORIAN_CURRENT_PROJECT_STATE_2026_06.md` | Current development state |
| `docs/ARELORIAN_LIVE_RENDER_PATH_AND_UI_INTEGRATION_RULES.md` | How to prove UI is actually live |
| `docs/ARELORIAN_ASSET_DIRECTOR_CLASSIFICATION_RULES.md` | Asset classification rules |
| `docs/ARELOGIC_INFINITE_LOOT_MACHINE.md` | Deterministic loot reference |

## Deep wiki

| Document | Purpose |
|----------|---------|
| `docs/wiki/Home.md` | Vision and axioms |
| `docs/wiki/Determinism.md` | Determinism deep dive |
| `docs/wiki/NPC_Core.md` | NPC memory and behavior |
| `docs/wiki/Systems_Architecture.md` | Tick, chunks, and systems |
| `docs/wiki/Economy_and_Matrix.md` | Resource and economy notes |
| `docs/wiki/Guard_and_Ops.md` | Guard rails and operations |

## Reading rule

Prefer current docs and active code over historical reconstruction notes.

When in doubt, ask:

```text
Is this change visible in the real client, validated by the server, deterministic where gameplay is involved, and covered by a test or smoke check?
```
