# Known Gaps (short list)

High-level gaps remain between this codebase and a shippable public MMORPG release.

Use `docs/ROADMAP_TO_RELEASE.md` as the authoritative backlog and `docs/PROJECT_STATUS_2026.md` as the shipped-state snapshot.

---

## Release blockers

- #2038 — repeatable production deploy and live verification gate
- #2039 — persistence backup and restore proof
- #2040 — production auth and session hardening
- #2041 — remaining deterministic audit violations
- #2043 — player-facing UI coverage for critical gameplay
- #2044 — audited release content pack and asset license proof
- #2045 — required full-loop E2E and release smoke gate

---

## Release gates now documented

- #2042 — mobile/browser performance budget: 2D and 3D startup, FPS, p95 frame, memory, chunk-load, fallback-tier and runtime-asset evidence requirements are now part of `docs/RELEASE_CHECKLIST.md`.

---

## Integrated runtime points

- #2050 — runtime civic state is derived from server `worldSurface` tick, house groups and lineage/citizen points, then exposed on the live gameplay snapshot as `civicState`.
- #2047 — runtime market pricing is derived from resource nodes and camp stock counters, then exposed on the live gameplay snapshot as `marketState`.
- #2049 — runtime observability is exposed through `GET /health/observability`, including tick, WebSocket, manifest, persistence, asset and playtester evidence.

---

## Open integration points

- #2046 — render lineage `worldSurface` in the 3D client
- #2048 — item provenance, trading and anti-duplication audit

---

## ARE constraint for all remaining work

No mock truth. No fake snapshots. No workflow tricks. No stub systems in the truth path. No facade that replaces real ARE causality.

Every new integration must either be an existing ARE system logic or interact with one directly: tick, chunk, kappa, hash, manifest, journal, delta, replay, resolver, or real runtime provider.
