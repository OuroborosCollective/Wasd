# Release Checklist — Areloria / WASD

This document serves as the **source of truth for release readiness**. Before any alpha/beta/public tag, all items below must be green.

Last updated: 2026-06-13

---

## Deployment Issue Found

**CRITICAL: Container is crashing on VPS due to missing game-data mount**

The `arelorian-engine` container is in a crash loop because `game-data/npc/npcs.json` is not available inside the container.

**Root Cause:** The `docker-compose.yml` does not mount `game-data` into the container. The VPS has the correct files at `/opt/areloria/game-data/` but the container only has these mounts:
- `./data:/app/data`
- `./logs:/app/logs`
- `./private-assets:/opt/areloria/private-assets:ro`

**Missing mount:** `./game-data:/app/game-data:ro` (or equivalent)

**Impact:** Tier A, item A1 (Production deploy verification) is BLOCKED.

---

## 1. Local Build & Guard Verification

Run these commands locally and confirm all pass:

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm run build

# 3. Run all guards
pnpm run guard:all

# 4. Validate Pixi assets
pnpm run assets:pixi:validate
pnpm run assets:pixi:validate-batches

# 5. Run server tests
pnpm --filter @wasd/server --if-present test

# 6. Determinism check
node scripts/check-are-determinism.mjs
```

| Check | Status | Notes |
|---|---|---|
| `pnpm run build` | ☐ | |
| `pnpm run guard:all` | ☐ | |
| `pnpm run assets:pixi:validate` | ☐ | |
| `pnpm --filter @wasd/server test` | ☐ | |
| `node scripts/check-are-determinism.mjs` | ☐ | |

---

## 2. Content & Asset Verification

```bash
# Audit model paths
pnpm run audit:model-paths

# Validate content
pnpm run validate --prefix server
```

| Check | Status | Notes |
|---|---|---|
| Model path audit green | ☐ | |
| Content validation green | ☐ | |
| Release content pack audited | ☐ | |
| Asset licenses tracked | ☐ | |

---

## 3. E2E Smoke Tests

```bash
# Install E2E dependencies (one-time)
pnpm run test:e2e:install

# Run E2E tests
pnpm run test:e2e
```

| Test | Status | Notes |
|---|---|---|
| `e2e/smoke.spec.ts` | ☐ | Health + WebSocket guest login |
| `e2e/full-loop-smoke.spec.ts` | ☐ | Full loop: login, movement, NPC, quest, combat, loot, reconnect |
| `e2e/client-2d-real-post-login-flow.spec.ts` | ☐ | Post-login UI shell |
| `e2e/quest-progression.spec.ts` | ☐ | Quest accept/progression |
| `e2e/resource-gathering.spec.ts` | ☐ | Resource gathering API |
| All other E2E tests | ☐ | |

---

## 4. Production Deploy Verification

After a successful VPS Docker deploy:

```bash
# Verify endpoints
curl -s http://arelorian.de/health | jq '.ok'
curl -s http://arelorian.de/client-config.json | jq '.'
curl -s http://arelorian.de/ | head -c 200
curl -s http://arelorian.de/2d | head -c 200
curl -s http://arelorian.de/portal | head -c 200
```

| Endpoint | Expected | Status |
|---|---|---|
| `/health` | `ok: true` | ☐ |
| `/client-config.json` | Valid JSON with Supabase config | ☐ |
| `/` | HTML landing page | ☐ |
| `/2d` | 2D client entry | ☐ |
| `/portal` | Portal page | ☐ |
| WebSocket upgrade | `101 Switching Protocols` | ☐ |

### Container State

```bash
# SSH to VPS and check container
docker ps | grep areloria
docker logs <container_id> --tail 50
```

| Check | Status | Notes |
|---|---|---|
| Container running | ☐ | |
| Recent logs clean | ☐ | |
| No OOM or crash | ☐ | |

---

## 5. Persistence & Backup Verification

```bash
# Test backup creation
curl -s http://arelorian.de/api/admin/backup/create

# Verify backup exists
curl -s http://arelorian.de/api/admin/backup/list

# Test restore drill (staging only)
```

| Check | Status | Notes |
|---|---|---|
| Backup creation works | ☐ | |
| Backup list accessible | ☐ | |
| JSON fallback operational | ☐ | |
| Restore drill recorded | ☐ | |

---

## 6. Auth/Session Hardening

| Check | Status | Notes |
|---|---|---|
| Guest login disabled in production | ☐ | `ALLOW_GUEST_LOGIN=0` |
| Dev login disabled in production | ☐ | `ALLOW_DEV_LOGIN=0` |
| Supabase auth required | ☐ | `REQUIRE_SUPABASE_AUTH=1` |
| Session expiry configured | ☐ | |
| Rate limits active | ☐ | |

---

## 7. Documentation Alignment

| Document | Status | Last Updated |
|---|---|---|
| `README.md` | ☐ | |
| `README_START_HERE.md` | ☐ | |
| `docs/PROJECT_STATUS_2026.md` | ☐ | |
| `docs/ROADMAP_TO_RELEASE.md` | ☐ | |
| `docs/DOCUMENTATION_INDEX.md` | ☐ | |
| `DEPLOYMENT.md` | ☐ | |
| `deploy/ENV_SETUP.md` | ☐ | |

---

## 8. Release Notes Draft

- [ ] Player-facing changelog prepared
- [ ] Internal engineering notes separate
- [ ] Version tag created: `vX.Y.Z`
- [ ] GitHub release draft published

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Engineering Lead | | | ☐ |
| DevOps | | | ☐ |
| Product | | | ☐ |

---

## Notes

_Add deployment-specific notes, issues encountered, and resolution details here._