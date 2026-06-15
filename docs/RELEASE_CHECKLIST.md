# Release Checklist — Areloria / WASD

This document is the release sign-off checklist. Before any alpha, beta, or public tag, every release blocker below must be green through real runtime evidence.

Last updated: 2026-06-15

---

## ARE release rule

No mock truth. No fake snapshots. No workflow tricks. No stub truth path. No facade as runtime truth.

Release proof must use real server/client runtime sources, deterministic tick/chunk/hash inputs, journals, deltas, manifests, or replayable state.

---

## 1. Local Build & Guard Verification

```bash
pnpm install
pnpm run build
pnpm run guard:all
pnpm run assets:pixi:validate
pnpm run assets:pixi:validate-batches
pnpm --filter @wasd/server --if-present test
node scripts/check-are-determinism.mjs
```

| Check | Status | Issue |
|---|---|---:|
| Root build | ☐ | #2045 |
| `guard:all` | ☐ | #2045 |
| Stateless Hardcode Audit | ☐ | #2041 |
| ARE Determinism Gate | ☐ | #2041 |
| Server tests | ☐ | #2045 |
| Client 2D build | ☐ | #2043 |

---

## 2. Content & Asset Verification

Tracked by #2044.

| Check | Status |
|---|---|
| Model path audit green | ☐ |
| Release content pack created | ☐ |
| Asset licenses tracked | ☐ |
| Fallback policy documented | ☐ |

---

## 3. E2E Smoke Tests

Tracked by #2045.

| Test | Status |
|---|---|
| Basic smoke | ☐ |
| Full-loop smoke | ☐ |
| 2D post-login flow | ☐ |
| Quest/resource/crafting flows | ☐ |
| Live deploy smoke | ☐ |

---

## 4. Production Deploy Verification

Tracked by #2038.

| Endpoint / check | Expected | Status |
|---|---|---|
| `/health` | real healthy response | ☐ |
| `/client-config.json` | valid JSON | ☐ |
| `/` | page response | ☐ |
| `/2d` | primary 2D client page/boot response | ☐ |
| `/portal` | portal response | ☐ |
| WebSocket upgrade | accepted upgrade | ☐ |
| Container | running and healthy | ☐ |
| Logs | clean recent runtime logs | ☐ |

---

## 5. Persistence & Backup Verification

Tracked by #2039.

| Check | Status |
|---|---|
| Migration SOP documented | ☐ |
| Backup artifact created | ☐ |
| Restore proof recorded | ☐ |
| JSON fallback policy documented | ☐ |
| Health shows actual persistence source | ☐ |

---

## 6. Auth/Session Hardening

Tracked by #2040.

| Check | Status |
|---|---|
| Guest login policy verified | ☐ |
| Dev login policy verified | ☐ |
| Supabase auth policy verified | ☐ |
| HTTP and WebSocket identity match | ☐ |
| Session expiry configured | ☐ |
| Rate limits active | ☐ |

---

## 7. Player-Facing UI Coverage

Tracked by #2043.

| Flow | Status |
|---|---|
| Quest tracker and map | ☐ |
| Inventory/equipment | ☐ |
| Crafting/storage | ☐ |
| Combat log/death/respawn | ☐ |
| Voting/warfront/boss flows | ☐ |
| Settings/accessibility | ☐ |

---

## 8. Performance and Observability

Performance budget evidence for #2042 must use real runtime assets and must include separate 2D and 3D measurements. If any standard budget is exceeded, the release is blocked unless the report records the real fallback tier, reason, and post-fallback metrics.

#2049 evidence endpoint: `GET /health/observability`.

| Check | Required measurement | Budget / rule | Status | Issue |
|---|---|---|---|---:|
| 2D startup | `/2d` startup time | <= 5000 ms standard, <= 6500 ms fallback | ☐ | #2042 |
| 2D FPS | average FPS and p95 frame time | >= 50 FPS and <= 34 ms p95, or >= 40 FPS and <= 42 ms fallback | ☐ | #2042 |
| 2D memory | runtime memory with real assets | <= 512 MB standard, <= 640 MB fallback | ☐ | #2042 |
| 2D chunk loading | p95 chunk-load time | <= 1200 ms standard, <= 1800 ms fallback | ☐ | #2042 |
| 3D startup | 3D client or `/portal` startup time | <= 9000 ms standard, <= 12000 ms fallback | ☐ | #2042 |
| 3D FPS | average FPS and p95 frame time | >= 30 FPS and <= 50 ms p95, or >= 24 FPS and <= 67 ms fallback | ☐ | #2042 |
| 3D memory | runtime memory with real assets | <= 1200 MB standard, <= 1600 MB fallback | ☐ | #2042 |
| 3D chunk loading | p95 chunk/world-load time | <= 2500 ms standard, <= 3500 ms fallback | ☐ | #2042 |
| Runtime metrics dashboard | tick duration, WS load, manifest status and persistence failures from `/health/observability` | visible in release evidence | ☐ | #2049 |
| Playtester stream health | playtester status from `/health/observability` | visible in release evidence | ☐ | #2049 |
| Asset audit failures visible | asset failure list from `/health/observability` | visible in release evidence | ☐ | #2049 |

Required #2042 evidence fields: release commit, content root, asset manifest hash, measured route, device class, tick window, startup time, average FPS, p95 frame time, memory use, p95 chunk-load time, fallback tier, and fallback reason when fallback is active.

---

## 9. Documentation Alignment

| Document | Status |
|---|---|
| `README.md` | ☐ |
| `README_START_HERE.md` | ☐ |
| `docs/PROJECT_STATUS_2026.md` | ☐ |
| `docs/ROADMAP_TO_RELEASE.md` | ☐ |
| `docs/KNOWN_GAPS.md` | ☐ |
| `DEPLOYMENT.md` | ☐ |
| `deploy/ENV_SETUP.md` | ☐ |

---

## 10. Release Notes Draft

- [ ] Player-facing changelog prepared.
- [ ] Internal engineering notes separate.
- [ ] Version tag created.
- [ ] GitHub release draft published.

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Engineering Lead | | | ☐ |
| DevOps | | | ☐ |
| Product | | | ☐ |

---

## Notes

Current release blockers are tracked by #2038 through #2050.
