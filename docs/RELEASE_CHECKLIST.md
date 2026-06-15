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

| Check | Status | Issue |
|---|---|---:|
| Startup/FPS/memory budget | ☐ | #2042 |
| Runtime metrics dashboard | ☐ | #2049 |
| Playtester stream health | ☐ | #2049 |
| Asset audit failures visible | ☐ | #2049 |

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
