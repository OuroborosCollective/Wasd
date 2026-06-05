# Areloria / WASD — Current Implementation Plan

This plan is a living, practical companion to:

- `README_START_HERE.md`
- `docs/PROJECT_STATUS_2026.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/DOCUMENTATION_INDEX.md`

It replaces older agent-package assumptions such as Three.js-only client, Python backend, npm-only setup, or one-off vertical-slice planning.

---

## 1. Objective

Continue building Areloria / WASD toward a stable public release while preserving the systems that already work.

The current project is a server-authoritative browser MMORPG foundation with:

- Node.js + TypeScript + Express + WebSocket server,
- authoritative `WorldTick` at roughly 100 ms / 10 Hz,
- Babylon.js 3D client,
- PixiJS v7 + React 2D client,
- JSON-driven content in `game-data/`,
- Supabase-first auth path,
- Postgres/file persistence drivers,
- deterministic manifest and ARE guard direction,
- live modules for combat, loot, quests, NPC runtime, chunks, resources, storage, warfront, world boss, voting, crafting, admin content, and playtester monitoring.

The goal is not to rewrite the engine. The goal is to harden, expose, test, document, and polish what already lives.

---

## 2. Current context summary

### Project

Areloria / Ouroboros / WASD — deterministic browser MMORPG and living-world simulation architecture.

### Current runtime stack

| Layer | Current path |
|---|---|
| Server | `server/` — Node.js, TypeScript, Express, `ws`, authoritative `WorldTick` |
| 3D client | `client/` — Vite, TypeScript, Babylon.js |
| 2D client | `apps/client-2d/` — PixiJS v7 + React |
| Data | `game-data/` JSON, optional `published-content/current` pack |
| Persistence | `PERSISTENCE_DRIVER=auto|postgres|file` |
| Auth | Supabase JWT path with explicit guest/dev toggles |
| Ops | VPS Docker/PM2 docs exist; active release work should verify current deploy workflow before trusting it |

### Already live foundations

- Server-authoritative movement/combat/skills.
- Inventory, equipment, loot pickup/drop/sync.
- Anti-Ninja Loot Lock.
- Player stats sync.
- Quest and questline systems.
- NPC memory/relationship/proactive chat runtime.
- Ouroboros agent tick.
- Chunk/world/resource/weather/time systems.
- Storage entities.
- Warfront, world boss, vote, crafting.
- Admin content tools and GLB/model-needs pipeline.
- Playtester monitor with WebRTC mode.
- Gameplay Fusion Director: quest echo, adaptive quest scene profiles, construction contracts.
- Monorepo/architecture/WorldTick guards.

---

## 3. Core rules — must not break

1. **Server authority:** gameplay truth belongs on the server.
2. **10 Hz simulation discipline:** no unbounded work inside `WorldTick`.
3. **Determinism:** simulation-affecting results must not depend on hidden wall-clock time or process-local randomness.
4. **64x64 chunk logic:** keep world partitioning consistent.
5. **Observer principle:** expensive simulation should be tied to observation/relevance.
6. **Data-driven content:** NPCs, quests, dialogue, spawns, items, and world content should stay generic and JSON/content driven where possible.
7. **Protected structures:** do not damage player-built/paid/protected structures unless an explicit reviewed policy allows it.
8. **Small PRs:** one focused change, clear verification, no unrelated lockfile churn.

---

## 4. Current priority order

### Priority 1 — release blockers

1. Verify production deploy path and domain routing.
2. Harden persistence migration, backup, restore, and rollback policy.
3. Lock down Supabase/session behavior for production.
4. Finish deterministic migration/gate for Level A/B simulation paths.
5. Validate Android/mobile performance budgets.
6. Complete player-facing UI for critical systems.
7. Audit release content pack and assets.
8. Keep smoke/E2E/deploy gates green.

### Priority 2 — player-visible MMORPG maturation

1. Quest tracker, map, settings, combat log.
2. Storage/crafting/voting/warfront/world-boss UI polish.
3. NPC reputation effects, refusal/help rules, bounded memory scenarios.
4. Combat/XP/stamina/mana balance.
5. Content pack quality pass.

### Priority 3 — deeper simulation systems

1. Settlement/civilization lifecycle.
2. Economy and Matrix Energy loop.
3. NPC politics and civic parity.
4. Housing/protected-structure validators.
5. Procedural dungeons and world-boss distance rules.
6. 13-point World Brain and advanced ARE research extensions.

---

## 5. Safe work categories

Safe, preferred next PRs:

- Documentation alignment.
- Tests and E2E smoke coverage.
- Content validation and model-path audit improvements.
- UI panels that consume existing server state.
- Guardrail improvements with low runtime risk.
- Small content additions under `game-data/`.
- Deploy verification docs/scripts that do not rewrite runtime behavior.

Risky, isolate carefully:

- `WorldTick` orchestration changes.
- Auth/session behavior changes.
- Persistence schema/migration behavior.
- Chunk/observer simulation rules.
- Combat/loot RNG and deterministic seed changes.
- Protected-structure or monetization policy changes.
- Broad workflow/deploy rewrites.

---

## 6. Standard implementation loop

1. **Assess**
   - Read current docs.
   - Inspect the exact code path.
   - Identify whether the change affects simulation truth, UI, ops, or docs only.

2. **Choose one small step**
   - Prefer one file group / one feature area.
   - Avoid broad refactors while release blockers are open.

3. **Implement**
   - Preserve deterministic inputs.
   - Feature-flag heavy systems.
   - Keep tick work bounded.
   - Update docs if behavior changes.

4. **Validate**
   - Run relevant package build/tests/guards.
   - For release path changes, include deploy verification notes.

5. **Report**
   - Goal.
   - Files changed.
   - What changed.
   - Checks run.
   - Risks.
   - Next step.

---

## 7. Validation command reference

Use package scripts as source of truth.

```bash
corepack enable
pnpm install
pnpm run build
pnpm run guard:all
pnpm --filter @wasd/server --if-present test
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/client --if-present build
pnpm --filter @wasd/client-2d --if-present build
pnpm run assets:pixi:validate
pnpm run assets:pixi:validate-batches
node scripts/check-are-determinism.mjs
```

For release/deploy work, also verify:

- `/health`
- `/client-config.json`
- `/`
- `/portal`
- WebSocket upgrade path
- container/process state
- recent engine logs
- backup/restore proof when persistence is touched

---

## 8. Immediate recommended next work

1. Merge the refreshed roadmap/docs PR.
2. Run the full guard/build suite on the branch.
3. Fix any workflow/docs mismatch around Docker vs PM2 deployment language.
4. Add a deterministic E2E smoke scenario covering login, movement, NPC interaction, quest update, combat, loot pickup, and reconnect.
5. Add a release checklist artifact that records exact green checks before alpha tags.

---

## 9. Operating principle

Work precisely. Work small. Preserve what already lives. Make every release claim traceable to code, tests, docs, or a verified deploy.
