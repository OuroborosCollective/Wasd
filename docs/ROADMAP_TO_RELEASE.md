# Roadmap to release — aligned with current codebase

This roadmap tracks the gap between what is already live in the repository and what still needs to be completed for a stable public release.

## How to use

1. Read `docs/PROJECT_STATUS_2026.md` first (current state).
2. Pick roadmap items, implement, and update both docs in the same PR/commit.
3. Keep `docs/MASTER_DESIGN_BIBLE.md` for vision changes only.

---

## Tier A — release blockers

| ID | Area | Gap | Current |
|----|------|-----|---------|
| A1 | Client performance | Reduce startup and runtime cost on mobile and low-end devices | Babylon chunk split + mobile budgets exist; further dynamic loading and GPU profiling needed |
| A1b | **2D Client Interpolation** | Smooth movement from 10 Hz server to 60 FPS render | **DONE**: `InterpolatedSpriteManager` with teleport-snap, precision-lock, delta-time scaling |
| A2 | Combat UX | Improve clarity, feedback, and edge-case handling | Core combat works; still needs richer combat log, clearer party/revive integration |
| A3 | Quest UX | Better objective feedback and progression visibility | Quest engine works; UI guidance and advanced objective summaries still limited |
| A4 | Persistence hardening | Production migration + backup policy consistency | `PERSISTENCE_DRIVER` works (`auto/postgres/file`); release needs strict migration and rollback SOP |
| A5 | Auth hardening | Supabase-first operational baseline across all docs/tools | Supabase is live path; remaining legacy references must stay archived only |

---

## Tier B — major system maturation

| System | Current | Remaining |
|--------|---------|-----------|
| Playtester monitor | WebRTC monitor + signaling + viewer/publisher pages shipped | Add ops dashboards and alerting around stream health |
| Admin content system | Upload, validation, publish-pack, model-needs shipped | Improve admin ergonomics and audit transparency for content edits |
| NPC autonomy | NPC memory/relationships/chat + fusion hooks active | Expand deterministic behavior scenarios and balancing for large NPC counts |
| Gameplay Fusion Director | Quest echo, adaptive profile overrides, construction contracts live | Add dedicated admin/debug visibility panel and tunable balancing config |
| World systems | Chunk/terrain/weather/resource foundations active | Expand biome/content depth and optimize streaming boundaries |
| **2D Client UI** | Inventory, Character overlay (press C), native CSS styling shipped | Expand with Quest tracker, Map, Settings panels |

---

## Tier C — polish and operational quality

- Stronger observability and SLOs for `/health`, websocket load, and playtester stream health.
- Automated release checklist and smoke pipeline refinement.
- Documentation hygiene enforcement in CI for stale references.
- Better player-facing onboarding and troubleshooting copy.

---

## Testing and quality gates

- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- `pnpm run audit:model-paths`
- `pnpm run test:e2e:ci` in CI before release tags

---

## Documentation debt to keep watching

- Historical reconstruction markdown files should remain explicitly non-authoritative.
- Any auth/persistence/infra documentation changes must be reflected in:
  - `README.md`
  - `AGENTS.md`
  - `docs/PROJECT_STATUS_2026.md`
  - `DEPLOYMENT.md`
  - `deploy/ENV_SETUP.md`

---

Last refreshed: 2026-04-26
