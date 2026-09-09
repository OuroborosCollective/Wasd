# Memory.md — Arelorian WASD

> Project-local, append-only integration memory for `OuroborosCollective/Wasd`.
> Historical bootstrap created 2026-09-09 from retrievable repository/conversation evidence.
> Never mix this file with Sovereign Studio ATO or Echoes of Aurion runtime truth.

## Operating contract

1. Read this file before every N+1 integration work session.
2. After each completed work block, append exactly one entry before merge.
3. Record task, decisions, touched surfaces, tests/evidence, learned result, open points and next safe step.
4. Append-only. Correct old claims with a new correction entry rather than rewriting history.
5. A green workflow is evidence only for what it actually executed. Runtime/product truth needs exact-revision readback.
6. Preserve WASD gameplay/world authority. Presentation or host consumers may project confirmed results but must not invent gameplay truth.
7. Deterministic core work remains bound to real tick/chunk/receipt/hash inputs. No mock, fake snapshot or workflow shortcut is runtime evidence.
8. Preserve the server-authoritative 10 Hz / 100 ms tick unless an explicitly evidenced architecture change supersedes it.
9. Secrets never belong in this file.

## Entry format

```text
### YYYY-MM-DD — short title
Status: VERIFIED | PARTIAL | BLOCKED | HISTORICAL
Task:
Decisions:
Touched surfaces:
Evidence:
Learned:
Open:
Next safe step:
```

---

### 2026-08-25 — Canonical installer path
Status: VERIFIED repository merge
Task: Make the production Docker deployment honor the provisioned installer path rather than assuming one fixed location.
Decisions: Prefer `VPS_DEPLOY_PATH`, keep `DEPLOY_PATH` only as compatibility alias, and reject relative paths or `/` before remote mutation.
Touched surfaces: Active Docker deployment workflows and canonical deploy-path regression.
Evidence: PR #2689 merged; head `aaed5c40f8f8a0769e982a6187a14c5e77ae41d3`; 4/4 focused workflow tests, root Vitest 3450/3450, clean diff.
Learned: Deployment-path identity is a safety boundary, not a convenience string.
Open: Merge alone did not prove the subsequent remote deployment.
Next safe step: Bind every live deploy readback to exact source/build stamp and the resolved installer path.

### 2026-08-25 — Populated non-Git installer recovery
Status: VERIFIED repository merge
Task: Recover deployment when the canonical installer directory already contained runtime files but no Git checkout.
Decisions: Initialize Git in-place, bind canonical remote, fetch/reset exact `origin/main`, preserve `.env`, data, logs and transferred client artifact.
Touched surfaces: Push/merge deployment scripts.
Evidence: PR #2690 merged; head `db14b2ea1f06240f1597ff8f7042caf88b6bd776`; focused regressions 6/6; root Vitest 3452/3452.
Learned: A non-empty runtime directory is not evidence of a repository checkout.
Open: Live build-stamp/browser proof remained a separate deployment obligation.
Next safe step: Keep remote mutation fail-closed until repository identity is established.

### 2026-08-25 — Runtime environment hydration
Status: VERIFIED repository merge
Task: Restore required runtime configuration on the canonical deployment path without leaking credentials.
Decisions: Transfer protected runtime values through a temporary mode-0600 file, preserve through cleanup only as needed, atomically integrate valid keys into `.env.docker`, then remove the temporary file.
Touched surfaces: Docker deploy workflows and runtime preflight.
Evidence: PR #2691 merged; head `6da785ab644ab80526f55813ddf78ac46d926b1e`; 8/8 workflow regressions; root Vitest 3454/3454; YAML/diff checks passed.
Learned: Runtime configuration must be hydrated through the canonical path while keeping command lines/logs secret-free.
Open: Configuration presence still required live preflight/readback.
Next safe step: Never infer runtime config from repository state; validate it at the target before container start.

### 2026-08-25 — Required world-seed hydration
Status: VERIFIED repository merge
Task: Fix fail-closed deployment preflight caused by missing `WASD_WORLD_SEED`.
Decisions: Hydrate from protected repository secret with repository-variable fallback and preserve strict Compose interpolation.
Touched surfaces: Both active Docker deployment routes.
Evidence: PR #2692 merged; head `01a02b30ace968ba8a720d1a4516ffed8ba8250b`; 8/8 targeted regressions; root Vitest 3454/3454.
Learned: A deterministic world seed is part of runtime identity and must not be silently invented.
Open: Target runtime confirmation remained required.
Next safe step: Fail closed whenever no configured seed exists.

### 2026-08-25 — Docker client-build memory recovery
Status: VERIFIED repository merge chain
Task: Resolve real VPS 3D Vite build Exit-137 failures caused by the constrained builder cgroup.
Decisions: First bound V8 heap to 512 MiB (#2693), then 256 MiB (#2695); after repeated real cgroup failure, stop tuning the VPS build and move the real 3D client build to the GitHub runner (#2696).
Touched surfaces: Docker builder limits and 3D artifact production path.
Evidence:
- #2693 merged; head `e34cf500c11df1e66e10556cc4c4c2e2c3adc33b`; 3456/3456 root tests.
- #2695 merged; head `894b7f01e6e449d76c6336d038149587fa7de31f`; 3456/3456 root tests.
- #2696 merged; head `92143c206991633c39ab00a579e12521a0cdf458`; 15/15 deployment/artifact regressions and 3461/3461 root tests.
Learned: Repeated parameter tuning is not a production fix once evidence shows the build belongs outside the constrained target cgroup.
Open: Runner-built artifact still needed source/build-stamp verification on transfer.
Next safe step: Prefer prebuilt immutable artifacts and verify commit identity before use.

### 2026-08-26 — Build shared package before 3D artifact
Status: VERIFIED repository merge
Task: Fix runner-side 3D build failure because `@wasd/shared/dist` had not been built.
Decisions: Build `@wasd/shared` immediately before the real 3D client build and assert `packages/shared/dist/index.js` exists.
Touched surfaces: Both active Docker deploy workflows and artifact regressions.
Evidence: PR #2697 merged; head `c0deff6744983f96c0fb103d9e4867e473f5c178`; 13/13 affected regressions; root Vitest 3461/3461.
Learned: Workspace dependency installation is not equivalent to producing its build artifacts.
Open: None inside this narrow build-order fix beyond normal live deployment evidence.
Next safe step: Keep artifact dependency order executable and regression-protected.

### 2026-08-26 — Deterministic Expanse transition foundation
Status: VERIFIED repository merge; intentionally ephemeral persistence scope
Task: Add the first Aurion-facing vertical slice as a server-authoritative tick-applied Tower-to-Expanse transition.
Decisions: Bind player sequence, idempotent receipts and interaction audit to authoritative server tick; client cannot choose player/zone/entry/return/position/tick.
Touched surfaces: WASD server transition logic, gameplay snapshot projection and passive 2D status.
Evidence: PR #2698 merged; head `06fd9982be06e8c5b4c157e6efba9ece1b56a3fd`; 410 files / 3469 tests, 10 Aurion target tests, server typecheck/client build passed.
Learned: Cross-project projection is safe only when WASD retains the decision and the consumer receives bounded confirmed output.
Open: No DB migration/rewards/combat/loot/XP/GLB activation was part of this slice.
Next safe step: Add persistence/effects only behind separate receipt-bound contracts.

### 2026-08-26 — NPC runtime memory mutability correction
Status: VERIFIED repository merge
Task: Fix production tick failure where `NPCSystem.commitThermalDecision()` tried to write `lastThermalDecision` into a frozen runtime-owned memory envelope.
Decisions: Keep immutable source leaves frozen, but allow the outer game-data NPC memory envelope to remain mutable because it is authoritative runtime state.
Touched surfaces: NPC game-data runtime memory and thermal tick regression.
Evidence: PR #2699 merged; head `e101e87a5d8283a6668df44c7aa8b9bb9e130ddd`; 8 NPC/emergent tests, server typecheck and 2D build passed.
Learned: Stateless/deterministic architecture does not mean freezing every runtime-owned projection. Ownership determines mutability boundaries.
Open: Production health/bundle/browser proof followed separately.
Next safe step: Keep source leaves immutable and runtime-owned envelopes explicit.

### 2026-08-26 — Bounded remote deploy waits
Status: VERIFIED repository merge
Task: Prevent opaque/unbounded remote deployment lock/build waits.
Decisions: Bound deploy lock to 300 s, engine build to 720 s and monitor bridge build to 300 s; preserve failure diagnostics.
Touched surfaces: `scripts/deploy-vps-docker.sh`.
Evidence: PR #2700 merged; head `fb404dddc7e85d76860e97eec7fb2fbb99c5a4ba`; Bash/diff checks and bounded-time calculation passed.
Learned: A bounded failure with diagnostics is more truthful than an unbounded workflow that appears merely “running”.
Open: Bounds do not prove successful deployment.
Next safe step: Preserve timeout receipts and causal diagnostics.

### 2026-08-26 — Docker ownership-layer optimization
Status: VERIFIED repository merge
Task: Fix deployment timeout caused by recursive ownership changes generating a large copy-on-write layer.
Decisions: Apply `--chown=nodeuser:nodejs` during builder-to-runner copies, keep write access only for `/app/data`, remove recursive full-tree ownership pass.
Touched surfaces: Runtime Dockerfile/image layer construction.
Evidence: PR #2701 merged; head `7fa26af189cd36d8f72a44c989ff28b2e4ab5298`; static Dockerfile gate and diff check passed.
Learned: Image-layer topology can be the bottleneck even when host RAM/CPU appear sufficient.
Open: Runtime behavior unchanged by design.
Next safe step: Measure deploy/image evidence rather than guessing from host capacity.

### 2026-08-26 — Ouroboros status runtime binding
Status: VERIFIED repository merge
Task: Repair a live NPC tick null dereference where `statusEmitter` was passed into `OuroborosEngine.tick()` as null.
Decisions: `WorldTickAdapter` constructs one `StatusEmitter` from the existing authoritative chat/router transport and binds it once to the registered tick system.
Touched surfaces: Tick adapter/status emission boundary.
Evidence: PR #2702 merged; head `5136641da4f0b791ee5cedf8be70225ba5bee71e`; real tick regression plus 23 tick-system tests, server typecheck and world-tick guard passed.
Learned: Optional-looking side-channel ports can still crash the authoritative tick if their binding contract is implicit.
Open: Side-channel must remain non-authoritative for gameplay decisions.
Next safe step: Keep status emission bound to real actions without elevating it into game authority.

### 2026-08-26 — 2D-first production readiness
Status: VERIFIED repository merge
Task: Stop the production deploy gate from requiring an optional 3D shell after the authoritative 2D server/client path was healthy.
Decisions: Remove `client_3d_shell_ready` from production-critical readiness while keeping 3D build/diagnostics separate.
Touched surfaces: Production readiness gates and `guard:deploy-2d-first`.
Evidence: PR #2703 merged; head `e82de07061f0c6a654c99f51a4b0c30d6e1ac024`; Bash, 2D-first guard and general guard completed.
Learned: Optional presentation surfaces must not block authority-path production readiness.
Open: 3D remained a separate diagnostic/build concern.
Next safe step: Keep acceptance gates aligned to the actually authoritative shipping surface.

### 2026-08-26 — Authoritative 2D world boot status
Status: VERIFIED repository merge
Task: Fix post-deploy bundle readback because required markers existed only in an unused future component, not the active 2D HUD bridge.
Decisions: Expose `deterministic-world-root` and `world-boot-status` from real `Live2DRuntimeSnapshot`/runtime evidence; do not invent local world/player state.
Touched surfaces: Active `DeterministicWorldIsoAppHudBridge` and boot-status test.
Evidence: PR #2704 merged; head `f39772d1d4c1e3507fd22d64366c39f99c242c5c`; focused boot tests and 2D build passed; real bundle contained both markers.
Learned: A marker in dead code is not production observability.
Open: Marker correctness remains subordinate to the server/runtime evidence from which it is derived.
Next safe step: Keep UI readiness as a projection of confirmed server state only.

### 2026-08-29 — Read-only WASD→Aurion source ledger
Status: VERIFIED repository merge
Task: Provide revision-pinned source evidence for Aurion migrations without turning source evidence into a production migration claim.
Decisions: Build a hash-only `server/src` ledger every six hours/on demand, use only `contents: read`, and perform no DB/schema/deploy action.
Touched surfaces: Source-ledger builder/workflow.
Evidence: PR #2728 merged; head `10646f5337e6dae5ec1346b0d222b02bc7dd6ca4`; Node syntax/test, full revision builder and strict SHA check passed.
Learned: Cross-repo evidence must distinguish source identity from consumer/runtime state.
Open: Aurion consumer still owns its own migration/apply/readback truth.
Next safe step: Pin consumers to an exact WASD commit and verify the ledger rather than trusting branch names.

### 2026-08-29 — Centralized player identity on land/questline routes
Status: VERIFIED repository merge
Task: Remove unauthenticated header-fallback ambiguity on land/questline routes.
Decisions: Use existing `PlayerIdentityResolver`; production rejects fallback unless explicit playtest flags allow it.
Touched surfaces: Land and questline HTTP routes.
Evidence: PR #2729 merged; head `c118398cc7e8618398adfb0eb6e56ec26f36c7b1`; 8 focused route tests, shared build and server typecheck passed.
Learned: Identity fallback must be explicit test/playtest policy, never an accidental production auth path.
Open: No database/deploy change was included.
Next safe step: Keep all new player-mutating routes on the canonical identity resolver.

### 2026-08-30 — Remove autonomous release-agent workflow
Status: VERIFIED repository merge
Task: Delete `.github/workflows/openhands-autonomous-release-agent.yml`.
Decisions: Remove the workflow rather than retaining an unused autonomous release path.
Touched surfaces: GitHub Actions.
Evidence: PR #2745 merged; head `db8d580cc962992930bc24fcd325befcb0130dcd`.
Learned: Removing an unused authority path reduces release ambiguity.
Open: None specific.
Next safe step: New release automation must be explicitly owned, revision-bound and evidence-gated.

### 2026-09-09 — WASD-owned confirmed NPC multi-memory capsule (AIM-292)
Status: VERIFIED repository merge; Aurion consumer proof is separate
Task: Move pure confirmed NPC/merchant multi-memory calculations into the WASD-owned source capsule without changing historical v2/v3 receipt bytes.
Decisions:
- Four bounded classes: working, episodic, semantic and configured procedural memory.
- Derive only from validated confirmed-decision receipts.
- Enforce expiry, canonical ordering, provenance, conflict/capacity, replay/duplicate and rehydration checks.
- Supply exact historical receipt lookup and reject coordinated false-fact + outer-hash rewrite.
Touched surfaces: `server/src/aurion/npc`, compiled capsule and source-bound manifest.
Evidence:
- PR #2842 merged; final head `68cc36798696a93bd24028fa5953a9dc59032566`.
- All 14 associated workflows succeeded.
- 14 original regressions + 13 compiled tests; two byte-identical capsule builds.
- Artifact `10093272363`, archive SHA-256 `18c752b47d4f615a6bf4786ae7a0378d2a1cc9b52796cee71f15bce9a1e892d9`.
- Manifest SHA-256 `cd38269a345914e422d5b3bfd6344a7ad7394d92d9220df0a385c2574dc13eae`; source SHA-256 `fcd4cbc5cfa3deae9389cf1aba6d7d376eec216834b877c30876fb488821442f`.
Learned: Structural self-hash validity is not enough; retained claims must be checked against their actual source receipts.
Open: Aurion owns transactional persistence/rendering proof for this source capsule.
Next safe step: Any new memory class or consumer must preserve WASD source authority and exact source/manifest binding.

### 2026-09-09 — Rule-gated NPC action gateway (AIM-293)
Status: VERIFIED repository merge; host transaction/consent remains separate
Task: Prevent arbitrary/stale planner output from directly authorizing gameplay mutation.
Decisions:
- Require an in-process verified v3 source decision, logical epoch, versioned market/polity evidence, capacity-inclusive inventory, canonical target and exact logical lease.
- Derive source receipt/goal/plan hashes from the verified decision; JSON look-alikes cannot enter.
- Create immutable hash-bound action receipt before effects and propagate it into NPC/world/polity requests.
- Keep the 80 original merchant cases as source-level golden compatibility evidence.
Touched surfaces: WASD NPC merchant action gateway/capsule ownership.
Evidence:
- PR #2843 merged 2026-09-09.
- Head `24f6a9cd498150b4ebf2ed87ccc6acb6c6c16d16`; merge commit `b54eb964fb9f1b97b9331c69569213eb143aae82`.
- Server typecheck; 15 source tests; 15/15 compiled capsule tests.
- Two fresh builds byte-identical.
- Source SHA-256 `7a524e3d329dd34205c41fdc00dc088e3b3187ab39c9f17a42a0c2cd8294e82f`; manifest SHA-256 `5b5a1bf04858ffdcefed5f9f623244d26371388f8cc96f72285e932afe6c1eae`.
Learned: Deterministic planning becomes safe gameplay input only after source-decision, epoch, evidence, capacity, target and lease are jointly bound.
Open: Aurion-side locking, transactional persistence, editorial consent and browser evidence are not proven by this WASD source merge.
Next safe step: Consumer integration must bind the exact merged WASD revision and prove effects/consent independently.

---

## Backfill boundary

This bootstrap covers retrievable integration history that materially affects present WASD architecture. It is not a transcript. When older blocks are recovered, append `Historical recovery` entries rather than rewriting the chronology.
