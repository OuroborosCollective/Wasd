# Roadmap to release — current implementation alignment

This roadmap tracks what is live in the repository and what still needs to be completed for a stable public release.

Read order:

1. `README_START_HERE.md` — entry point and current-document hierarchy.
2. `docs/PROJECT_STATUS_2026.md` — current implementation snapshot.
3. `docs/ROADMAP_TO_RELEASE.md` — this release backlog.
4. `docs/RELEASE_CHECKLIST.md` — release sign-off checklist.
5. `docs/KNOWN_GAPS.md` — compact open-gap index.
6. `docs/DOCUMENTATION_INDEX.md` — current vs historical documentation map.

Any PR or commit that changes runtime behavior must update `docs/PROJECT_STATUS_2026.md` and this roadmap if release scope changes.

---

## ARE Green-State release rule

Release work must follow the Areloria truth-path rule:

```text
No mock truth.
No fake snapshots.
No workflow tricks.
No stub systems in the truth path.
No facade that replaces real runtime causality.
```

Allowed truth sources:

```text
Kappa1000
Tick / logicalIndex
Chunk / world position
Hash / manifest / seed input
Journal / delta / replay
Real runtime providers
Deterministic calculation
Side-channel separation for IO, telemetry, repair and persistence
```

---

## Release posture

**Current state:** working browser-MMORPG foundation, not a finished commercial MMO.

The repo now contains a serious live foundation: authoritative 10 Hz Node/WebSocket simulation, Vite/Babylon 3D client, PixiJS/React 2D client, server-authoritative gameplay modules, Supabase/Postgres/file persistence paths, optional Redis, deterministic manifest checks, admin content tools, autonomous playtester monitoring, and live world systems.

Recent release-relevant progress:

- VPS game-data mount was fixed and live `/health` was verified.
- NPC lineage now has journal, replay, surface projection and 2D worldSurface visibility.
- Snapshot-time lineage birth bridge exists and can consume real runtime state.
- Visible POI/Camp NPC data can feed lineage runtime state without fake NPCs.
- Deterministic hardcode cleanup removed several runtime `Date.now()` / `Math.random()` violations.
- Legacy loot table generation is quarantined; production loot truth remains `LootDirector -> ProceduralLootMachine -> loot_delta`. Inventory-Consumer verwenden persistente Loot-Origin-Deduplizierung; vollständig abgelehnte Inventar-Deltas fallen ausschließlich an den serverseitigen WorldDrop-Consumer zurück.
- PR #2036 is open to remove the public legacy-loot boolean bypass after Codex review.
- The #2042 mobile/browser performance budget now has explicit 2D and 3D release measurements in `docs/RELEASE_CHECKLIST.md`.

The release focus is now:

1. finish deterministic correctness and hardcode cleanup,
2. prove deploy, persistence, backup and live verification,
3. complete player-facing UI coverage,
4. collect real mobile/browser performance evidence against the documented #2042 budgets,
5. ship an audited release content pack,
6. promote full-loop E2E/live smoke into a required release gate.

---

## Completed / live integrations

| Area | Status | Notes |
|---|---:|---|
| Authoritative runtime | DONE | `server/src/core/WorldTick.ts` runs the main ~100 ms / 10 Hz simulation loop. |
| WebSocket networking | DONE | Server networking is wired through `server/src/networking/WebSocketServer.ts`. |
| 3D client foundation | DONE | Vite + Babylon.js client remains the primary 3D path. |
| 2D client foundation | DONE | PixiJS v7 + React client is active under `apps/client-2d/`. |
| Manifest system | DONE | Server-authoritative hash-chain state under `server/src/core/manifest/`, client divergence detection under `apps/client-2d/src/manifest/`, resync API at `/api/manifest/*`. |
| Persistence drivers | DONE / HARDENING | `PERSISTENCE_DRIVER=auto/postgres/file`, JSON fallback, and health summary are wired; backup/restore proof remains open in #2039. |
| VPS game-data mount | DONE | `docker-compose.yml` mounts `./game-data:/app/game-data:ro`; live VPS health reported content root `/app/game-data`. |
| Player movement/combat | DONE / BALANCING | Movement, target selection, attacks, skills, cooldown/mana, death/respawn are wired. |
| Inventory/equipment/loot | DONE / HARDENING | Inventory stacks, equip/unequip, loot drops, pickup, and sync are active; loot legacy path is quarantined. |
| Canonical loot truth | DONE / HARDENING | `LootDirector -> ProceduralLootMachine -> loot_delta`; PR #2036 restricts legacy construction further. |
| Quest and questlines | DONE / CONTENT | Quest start, progression, sync, talk/collect/combat updates and questline unlock propagation are active. |
| NPC runtime | DONE / EXPANDING | NPC memory, relationships, proactive chat, game-data loading, Living Duden speech, lineage journal/replay and POI-driven lineage runtime state exist. |
| Lineage worldSurface | DONE / 3D IN PROGRESS | Server journal/replay projects lineage houses/nodes into `worldSurface`; 2D consumes es. PR #2484 bindet denselben read-only Vertrag in den Babylon-Pfad ein; #2046 bleibt offen, bis Browser-Paritätsevidence vorliegt. |
| Chunk/world foundations | DONE / HARDENING | Chunks, observers, objects, weather/time, terrain adapters and deterministic resource nodes are wired. |
| Crafting/storage | DONE / UI HARDENING | Crafting and storage handlers are wired; full player-facing flow remains part of #2043 and #2048. |
| Admin content tools | DONE / HARDENING | `/api/admin/content/*`, content publish path and model-path audit exist; release content pack tracked by #2044. |
| Playtester monitor | DONE / REPORTING | WebRTC monitor, signaling, viewer page and publisher page are shipped; release observability tracked by #2049. |
| ARE deterministic primitives | DONE | `AREClock`, fixed clocks, seeded RNG and `createARESeed` exist; remaining audit cleanup tracked by #2041. |
| Performance budget | DONE / EVIDENCE REQUIRED | #2042 budgets are documented in `docs/RELEASE_CHECKLIST.md`; release sign-off requires real 2D and 3D runtime metrics plus fallback proof when needed. |

---

## Tier A — release blockers

These block a public release tag.

| ID | Issue | Area | Required outcome |
|---|---|---|---|
| A1 | #2038 | Production deploy verification | One green deploy workflow plus live verification against `/`, `/2d`, `/portal`, `/health`, `/client-config.json`, and WebSocket upgrade. |
| A2 | #2039 | Persistence + backups | Migration SOP, backup proof, restore proof and JSON fallback policy. |
| A3 | #2040 | Auth/session hardening | Production env rejects unintended guest/dev auth; sessions and rate limits are tested. |
| A4 | #2041 | Deterministic simulation hardening | Stateless Hardcode Audit and ARE Determinism Gate pass for runtime-critical paths. |
| A5 | #2042 | Mobile/browser performance | 2D and 3D startup, FPS, p95 frame, memory and chunk-load budgets are documented; release sign-off is blocked unless real metrics meet standard budget or record a real fallback tier and reason. |
| A6 | #2043 | Player-facing UI coverage | Critical systems are usable through server-backed UI flows without dev knowledge. |
| A7 | #2044 | Release content pack | Audited `published-content/current` pack with licenses and model-path audit proof. |
| A8 | #2045 | Full-loop release gate | Build, guards, model audit, unit tests, E2E, deploy verify and live health are green on release commit. |

---

## Tier B — open integration work

| Issue | Integration | Required direction |
|---|---|---|
| #2046 | 3D lineage worldSurface rendering | 3D client consumes the same server `worldSurface.groups/points` contract as 2D. PR #2484 implementiert den Adapterpfad; Browser-Paritätsevidence steht noch aus. |
| #2050 | Runtime civic state | Shared world state derives from tick, house data, population counters and server snapshot. |
| #2047 | Runtime market pricing | Prices derive from live resource counters, tick and deterministic hash logic. |
| #2048 | Item provenance / trading / anti-duplication | Item movement uses real uid, source delta, tick/hash audit and server-authoritative inventory. |
| #2049 | Runtime observability and release SLOs | Tick duration, WS load, manifest divergence, persistence failures, asset audit failures and playtester status are visible. |

---

## Tier C — polish and operational quality

- Player onboarding: clear first-login path, first quest guidance, controls, death/respawn explanation, and troubleshooting copy.
- Visual polish: replace placeholder UI copy, unify 2D/3D style language, improve hit/loot/quest feedback.
- Accessibility: readable mobile HUD, touch-safe controls, reduced motion option, scalable text, and contrast checks.
- Security: production env secret audit, CORS/session/rate-limit policy, admin route protection, and safe error messages.
- Documentation hygiene: current docs must stay separate from historical reconstruction packs.
- Release notes: keep player-facing changelog separate from internal engineering notes.

---

## Planned / vision integrations after release foundation

These belong after release blockers are controlled, unless a small isolated PR can land safely.

| Integration | Target direction | Status |
|---|---|---|
| WASD → Aurion source ledger | Revision-bound WASD source inventory is available to Aurion through a pinned reusable workflow and a hash-only artifact. | Implemented as a read-only coordination gate; it must not be interpreted as production migration or persistence evidence. |
| Genealogy and houses | NPC family lines, inheritance, house reputation and deterministic lineage history. | Implemented foundation; 3D rendering open in #2046. |
| Full NPC politics | NPCs and players participate in shared civic rules. | Future; must build on #2050, not a mock layer. |
| Guild/village/city/kingdom/nation hierarchy | Rule-bound civilization growth through biome-bounded territories. | Future; must derive from server runtime state. |
| Deep economy simulation | Supply/demand, scarcity, taxes, trade routes, public works and merchant behavior. | Open foundation in #2047. |
| Matrix Energy | Player-facing world/building energy loop with deterministic accounting. | Future; must share accounting rules with #2047. |
| Housing and protected structures | Build permissions, placement validation, ownership and protection tiers. | Future; must not bypass layout validation. |
| Procedural dungeons | Deterministic dungeon generation, boss distance rules, reward tables and party flow. | Future; must use tick/chunk/hash seeds. |
| ARE research extensions | Kappa-field replay, AREGuard proof reports, state compression and anomaly scheduling. | Future. |
| 13-point World Brain | Global directive vector from resources, population, conflict, environment, market and culture. | Future; must consume real runtime signals only. |

---

## Testing and quality gates

Minimum local/release checks:

```bash
pnpm install
pnpm run build
pnpm run guard:all
pnpm run assets:pixi:validate
pnpm run assets:pixi:validate-batches
pnpm --filter @wasd/server --if-present test
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/client --if-present build
pnpm --filter @wasd/client-2d --if-present build
node scripts/check-are-determinism.mjs
```

Release CI should additionally include:

- model-path audit,
- full-loop E2E smoke test,
- manifest divergence/resync test,
- WebSocket guest/login flow test,
- content publish dry-run,
- VPS deploy verification,
- live `/health` verification that reports content root `/app/game-data`,
- real 2D and 3D performance evidence for startup, FPS, p95 frame time, memory and chunk loading,
- fallback-tier evidence when either client exceeds the standard #2042 budget,
- backup/restore proof for persistence.

---

## Documentation debt to keep watching

Historical reconstruction markdown files should remain explicitly non-authoritative.

Any auth, persistence, infra, deploy, gameplay, or architecture change must be reflected in the relevant source-of-truth docs:

- `README.md`
- `README_START_HERE.md`
- `docs/PROJECT_STATUS_2026.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/DOCUMENTATION_INDEX.md`
- `DEPLOYMENT.md`
- `deploy/ENV_SETUP.md`
- `.env.example` / production env templates when config changes

---

## Immediate next release sequence

1. Merge #2036 if CI is green to close the legacy-loot constructor bypass.
2. Finish #2041 deterministic audit cleanup.
3. Prove #2038 deploy/live verification.
4. Prove #2039 backup/restore.
5. Harden #2040 production auth/session rules.
6. Collect #2042 real 2D/3D performance evidence against the documented budgets.
7. Make #2045 full-loop E2E and live smoke a required release gate.
8. Complete #2044 release content pack audit.
9. Prepare public alpha release notes.

---

Last refreshed: 2026-06-15
