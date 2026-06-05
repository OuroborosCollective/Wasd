# Roadmap to release — current implementation alignment

This roadmap tracks the gap between what is already live in the repository and what still needs to be completed for a stable public release.

Read order:

1. `README_START_HERE.md` — entry point and current-document hierarchy.
2. `docs/PROJECT_STATUS_2026.md` — authoritative implementation snapshot.
3. `docs/ROADMAP_TO_RELEASE.md` — this release backlog.
4. `docs/MASTER_DESIGN_BIBLE.md` — vision and pillars only.
5. `docs/DOCUMENTATION_INDEX.md` — current vs historical documentation map.

Any PR or commit that changes runtime behavior must update `docs/PROJECT_STATUS_2026.md` and this roadmap if release scope changes.

---

## Release posture

**Current state:** working browser-MMORPG foundation, not a finished commercial MMO.

The repo now contains a serious live foundation: authoritative 10 Hz Node/WebSocket simulation, Vite/Babylon 3D client, PixiJS/React 2D client, server-authoritative gameplay modules, Supabase/Postgres/file persistence paths, optional Redis, deterministic manifest checks, admin content tools, autonomous playtester monitoring, and multiple live world systems.

The release focus is therefore no longer “prove the engine exists”. The focus is:

1. harden deterministic gameplay correctness,
2. finish production deploy and backup discipline,
3. complete player-facing UI coverage,
4. stabilize mobile performance,
5. replace placeholder content with audited assets,
6. validate the whole loop through CI, E2E, replay, and live VPS verification.

---

## Completed / live integrations

These are considered implemented or wired enough to be tracked as live foundations. They can still need balancing, UI polish, load testing, or ops hardening.

| Area | Status | Notes |
|---|---:|---|
| Authoritative runtime | DONE | `server/src/core/WorldTick.ts` runs the main ~100 ms / 10 Hz simulation loop. |
| WebSocket networking | DONE | Server networking is wired through `server/src/networking/WebSocketServer.ts`. |
| 3D client foundation | DONE | Vite + Babylon.js client remains the primary 3D path. |
| 2D client foundation | DONE | PixiJS v7 + React client is active under `apps/client-2d/`. |
| 2D interpolation | DONE | `InterpolatedSpriteManager` smooths 10 Hz server state toward render FPS with teleport snap and precision locking. |
| Manifest system | DONE | Server-authoritative hash-chain state under `server/src/core/manifest/`, client divergence detection under `apps/client-2d/src/manifest/`, resync API at `/api/manifest/*`. |
| Supabase auth path | DONE | Supabase JWT flow and client auth provider are documented as the active production path. |
| Persistence drivers | DONE | `PERSISTENCE_DRIVER=auto/postgres/file`, JSON fallback, and health summary are wired. |
| Redis optional path | DONE | Optional Redis cache/chat relay paths degrade gracefully when unset. |
| Health endpoint | DONE | `/health` summarizes auth, persistence, playtester, self-healing, and content-root status. |
| Player movement/combat | DONE | Movement, target selection, attacks, skills, cooldown/mana, death/respawn are wired. |
| Inventory/equipment/loot | DONE | Inventory stacks, equip/unequip, loot drops, pickup, and sync are active. |
| Anti-Ninja Loot Lock | DONE | Loot ownership lock is active via `LootDirector` with 60-second / 600 tick kill lock. |
| Player stats sync | DONE | `PlayerStatsDirector` broadcasts server-authoritative XP/level snapshots. |
| Quest system | DONE | Quest start, progression, sync, talk/collect/combat updates are active. |
| Questline system | DONE | Questline engine, bridge, and unlock propagation are wired. |
| NPC runtime | DONE | `NPCSystem`, memory cache/persistence, relationships, and proactive chat are wired. |
| Ouroboros agents | DONE | `OuroborosEngine` is instantiated and ticked from `WorldTick`. |
| Chunk/world foundations | DONE | Chunks, observers, objects, weather/time, and terrain adapters are wired. |
| Resource entities | DONE | Deterministic resource nodes are aligned through `ChunkModificationDirector` and `ResourcePopulator`. |
| Storage system | DONE | `StorageEntity`, inventory, `open_storage`, and `transfer_item` handlers are wired. |
| Warfront | DONE | `WarfrontSystem` lifecycle, status pushes, and reward claims are wired. |
| World boss | DONE | `WorldBossDungeonSystem` encounter flow and ranking summaries are wired. |
| Vote system | DONE | Vote banner/session/status and reward claims are wired. |
| Crafting | DONE | Crafting handlers are wired through server message flow. |
| Admin content tools | DONE | `/api/admin/content/*` routes and `/admin-content.html` are active. |
| Playtester monitor | DONE | WebRTC monitor, signaling, viewer page, and publisher page are shipped. |
| Gameplay Fusion Director | DONE | Quest echo beacons, adaptive quest scene profiles, and construction contracts are active. |
| Content publish path | DONE | `pnpm run content:publish`, model-path audit, admin model needs, and GLB registry/pools are present. |
| Pixi asset import scripts | DONE | Cozy/2D asset workflows are represented through import/validate scripts in root `package.json`. |
| Monorepo/architecture guards | DONE | `guard:monorepo`, `guard:architecture`, `guard:worldtick`, and `guard:all` scripts exist. |
| ARE deterministic primitives | DONE | `AREClock`, `SystemAREClock`, `FixedAREClock`, `ARERng`, `SeededARERng`, and `createARESeed` are documented primitives. |
| Determinism gate | DONE / HARDENING | Gate exists; Level A/B simulation paths still need strict migration verification before public release. |

---

## Tier A — release blockers

These block a public release tag.

| ID | Area | Release gap | Required outcome |
|---|---|---|---|
| A1 | Production deploy verification | VPS Docker deploy, Nginx routing, `/`, `/portal`, `/health`, `/client-config.json`, and WebSocket upgrade must be proven after each deploy. | One green deploy workflow plus one green final verification workflow against `arelorian.de`. |
| A2 | Persistence + backups | Postgres migration, backup, restore, and rollback story must be operational, not only configurable. | Documented migration SOP, automated backup check, restore drill, and JSON fallback policy. |
| A3 | Auth/session hardening | Supabase is the live path, but public launch needs strict session rules and dev bypass lockdown. | Production env rejects unintended guest/dev auth; rate limits and session expiry are tested. |
| A4 | Deterministic simulation hardening | All Level A/B combat, loot, oracle, warfront, boss, and gameplay-result paths must avoid hidden wall-clock/randomness. | Determinism gate passes for simulation-critical paths; exceptions are documented and reviewed. |
| A5 | Mobile performance | Android/tablet/browser startup and runtime cost must stay stable with real assets. | Measured FPS/memory/startup budget, chunk loading budget, and fallback quality levels. |
| A6 | Player-facing UI coverage | Many systems exist server-side, but not every critical action has clear player UI. | Quest tracker, map, settings, combat log, inventory/equipment, storage, crafting, voting, warfront, boss, and death/respawn flows usable without dev knowledge. |
| A7 | Release content pack | Placeholder or broken assets must not be part of the first public impression. | Audited `published-content/current` pack with model-path audit green and asset licenses tracked. |
| A8 | Smoke/E2E release gate | Public release must not depend on manual hope. | `pnpm run build`, `pnpm run guard:all`, model audit, unit tests, E2E smoke, and deploy verification are green. |

---

## Tier B — major open work

These do not necessarily block a closed alpha, but they define whether the project feels like a real MMORPG instead of a tech demo.

| System | Current | Remaining |
|---|---|---|
| Combat and skills | Server-authoritative combat, skills, cooldown/mana, loot and respawn are wired. | Balance stamina/mana/XP curves, improve combat feedback, revive/party edge cases, boss telegraphs, and combat log clarity. |
| Quest and questlines | Quest/questline systems are active, with fusion echo hooks. | Add richer objective summaries, map pins, quest tracker, branching outcomes, and QA fixtures for multi-step chains. |
| NPC autonomy | NPC system, memory, relationships, proactive chat, and personality beta exist. | Expand deterministic behavior scenarios, bounded shared memory, reputation effects, refusal/help rules, genealogy, faction memory, and large-NPC load budgets. |
| Civilization | Bible defines guild -> village -> city -> kingdom -> nation and equal NPC/player civic rights. | Implement settlement lifecycle, law/tax/election flows, NPC/player political parity, territory/biome borders, and protected structure policies. |
| Economy and Matrix Energy | Economy/Matrix are design pillars; construction contracts are active. | Implement deterministic local markets, scarcity pricing, taxes, trade routes, Matrix Energy sinks/sources, and public works budget flow. |
| World systems | Chunks, resources, weather/time, terrain adapters, world objects, warfronts, and bosses are wired. | Expand biome depth, dungeon templates, ecological pressure, migration triggers, world boss distance constraints, and streaming boundary tests. |
| Crafting/storage/trading | Crafting and storage handlers are wired. | Finish UI, permissions, recipe discovery, item provenance, player trading, anti-duplication checks, and audit logs. |
| Admin/GM content | Admin content API, content page, model needs, publish pack, and audits are active. | Improve audit transparency, content rollback, live moderation tools, edit history, and safe publish preview. |
| Playtester monitor | WebRTC viewer/publisher and signaling are shipped. | Add stream-health dashboard, alerting, run history, deterministic scenario packs, and release-report export. |
| Self-healing/runtime safeguards | Health endpoint includes self-healing summary; liveheal docs and patterns exist. | Tie safeguards to release dashboards, quarantine broken GLB/assets, add city-layout validators, and keep repair telemetry outside simulation truth. |
| Observability | `/health` exists; deploy verification can check endpoints and logs. | Add SLOs for tick duration, WebSocket load, manifest divergence, playtester stream health, persistence failures, and asset audit failures. |

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

These belong after the release blockers are controlled, unless a small isolated PR can land safely.

| Integration | Target direction |
|---|---|
| Genealogy and houses | NPC family lines, inheritance, house reputation, and deterministic lineage history. |
| Full NPC politics | NPCs vote, tax, declare war, negotiate peace, appoint rulers, rebel, and join/found factions. |
| Guild/village/city/kingdom/nation hierarchy | Rule-bound civilization growth from player/NPC organizations through biome-bounded territories. |
| Deep economy simulation | Supply/demand, scarcity, taxes, trade routes, public works, war pressure, and NPC merchant personality. |
| Matrix Energy | Player-facing world/building energy loop with deterministic accounting and protected paid-asset policy. |
| Housing and protected structures | Build permissions, placement validation, road/wall/gate constraints, ownership, protection tiers, and PvP/world-event policy. |
| Procedural dungeons | Deterministic dungeon generation, boss distance rules, reward tables, replay-safe seeds, and party flow. |
| ARE research extensions | Kappa-field replay, AREGuard proof reports, state compression, resonance/plexity scheduling, and deterministic anomaly zones. |
| 13-point World Brain | Global directive vector from resources, population, conflict, environment, politics, market, culture, threats, opportunities, echoes, oracle resonance, and center aggregator. |
| Future event layers | Aetheric Leylines, Chronos Anomaly zones, Void Swarm incursions, reality fissures, and oracle-driven world events. |

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
- E2E smoke test,
- manifest divergence/resync test,
- WebSocket guest/login flow test,
- content publish dry-run,
- VPS deploy verification,
- restore-drill proof for persistence backups.

---

## Documentation debt to keep watching

Historical reconstruction markdown files should remain explicitly non-authoritative.

Any auth, persistence, infra, deploy, gameplay, or architecture change must be reflected in the relevant source-of-truth docs:

- `README.md`
- `README_START_HERE.md`
- `docs/PROJECT_STATUS_2026.md`
- `docs/ROADMAP_TO_RELEASE.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/MASTER_DESIGN_BIBLE.md` only when the vision changes
- `DEPLOYMENT.md`
- `deploy/ENV_SETUP.md`
- `.env.example` / production env templates when config changes

---

## Immediate next release sequence

1. Green local build + guards.
2. Green deterministic gate for Level A/B simulation paths.
3. Green content/model/asset audits.
4. Green E2E smoke with guest/login, movement, interaction, combat, loot, quest sync, and WebSocket reconnect.
5. Green VPS Docker deploy to `/opt/areloria`.
6. Green host verification for `arelorian.de`, `/`, `/portal`, `/health`, `/client-config.json`, and WebSocket upgrade.
7. Backup and restore drill recorded.
8. Public alpha release notes prepared.

---

Last refreshed: 2026-06-05
