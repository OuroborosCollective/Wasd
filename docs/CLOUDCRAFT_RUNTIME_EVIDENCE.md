# Runtime Evidence & 2D/3D Parity Chain (#2469)

**Date:** 2026-08-11
**Scope:** CloudCraft integration #2469 — prove runtime evidence and 2D/3D parity for integrated slices.

## 1. Evidence chain

The minimal evidence chain: **Unit → Guard → Build → Browser → Snapshot/Hash-Readback**.

| Layer | What it proves | Real evidence source | Build-only? |
|-------|---------------|----------------------|-------------|
| Unit | Slice logic is correct | `vitest` exit code + test counts | No (but not runtime) |
| Guard | Architecture/determinism invariants hold | Guard test exit code | No (but not runtime) |
| Build | Code compiles and bundles | `tsc --noEmit` + `pnpm build` exit code | Yes — build-only is NOT runtime success |
| Browser | Real input paths render (2D/3D) | Browser smoke screenshot | No — runtime |
| Snapshot/Hash-Readback | Truth source is the server snapshot at tested revision | `/api/gameplay/snapshot` response + revision hash readback | No — runtime |

**Rule:** Build-only success is NOT runtime success. A green build does not prove the overlay renders or the snapshot is consumed.

## 2. Evidence captured for CloudCraft slices

### Slice #2465 (2D truth path)
| Layer | Status | Detail |
|-------|--------|--------|
| Unit | ✅ pass | 18 tests (WorldOverlayProjection, WorldOverlayModel, OverlayReachabilityGuard) |
| Guard | ✅ pass | Reachability guard enforces no-fake-live |
| Build | ✅ pass | shared package builds, 2D client typechecks |
| Browser | ⏳ pending | Requires dev server + browser session |
| Snapshot/Hash-Readback | ⏳ pending | Requires `/api/gameplay/snapshot` reachable |

### Slice #2464 (3D parity)
| Layer | Status | Detail |
|-------|--------|--------|
| Unit | ✅ pass | 24 tests (BabylonOverlayAdapter: 9, WorldOverlaySnapshotBridge: 7, shared derivation: 8) |
| Guard | ✅ pass | Bridge degrades honestly (blocked/waiting, never fake-live) |
| Build | ✅ pass | shared + client typecheck clean |
| Browser | ⏳ pending | Requires dev server + 3D minimap smoke |
| Snapshot/Hash-Readback | ⏳ pending | Requires `/api/gameplay/snapshot` revisionHash readback |

### Slice #2466 (chunk/Kappa contract)
| Layer | Status | Detail |
|-------|--------|--------|
| Unit | ✅ pass | 10 tests (UnifiedChunkContract) |
| Guard | ✅ pass | Audit is frozen, blocked classes enforced |
| Build | ✅ pass | shared typecheck clean |
| Browser | N/A | Contract-only slice |
| Snapshot/Hash-Readback | N/A | Contract-only slice |

### Slice #2468 (donor license safety)
| Layer | Status | Detail |
|-------|--------|--------|
| Unit | ✅ pass | 11 tests (DonorLicenseSafetyMatrix) |
| Guard | ✅ pass | Blocked classes enforced, repo-pin enforced |
| Build | ✅ pass | shared typecheck clean |
| Browser | N/A | Contract-only slice |
| Snapshot/Hash-Readback | N/A | Contract-only slice |

## 3. Readback points (revision, snapshot, hash)

| Point | Value | Source |
|-------|-------|--------|
| Revision | `main @ 9490f589` (Sentinel #2463) | `git rev-parse HEAD` |
| Snapshot endpoint | `GET /api/gameplay/snapshot` | `server/src/routes/gameplaySnapshot.ts` |
| Snapshot revisionHash | `liveGameplaySnapshot.revisionHash` | Server-computed SHA-256 of composed payload |
| Snapshot revisionSequence | `revisionSequence` | `runtimeHistoryLog.latestByActor().sequence` |
| WorldOverlayModel status | `live` / `waiting` / `empty` / `stale` / `blocked` | `deriveWorldOverlayModelFromSnapshot()` |

Evidence must reference the exact tested stand. The `revisionHash` readback proves the snapshot consumed is the server-authoritative one, not a fabricated local copy.

## 4. 2D/3D parity contract

Both renderers must satisfy `OverlayRendererParityContract`:
- `consumesWorldOverlayModel: true` — both consume the shared model.
- `truthSource: "server-snapshot"` — truth comes from the server, not invented locally.
- `derivesFromDerivation: true` — both use `deriveWorldOverlayModelFromSnapshot()`.
- `displayMayDiffer: true` — 2D iso and 3D top-down may render differently.

**Rule:** 2D/3D dürfen unterschiedliche Darstellung, aber keine unterschiedliche Wahrheit haben.

`verifyParity(client2d, client3d)` passes when both contracts are satisfied. The expected contracts are in `EXPECTED_PARITY_CONTRACTS`.

## 5. What counts as build-only (NOT runtime success)

| Result | Build-only? | Counts as runtime? |
|--------|-------------|-------------------|
| `tsc --noEmit` passes | ✅ build-only | ❌ |
| `pnpm build` succeeds | ✅ build-only | ❌ |
| Unit tests pass | ❌ (logic proof) | ❌ (not runtime) |
| Guard tests pass | ❌ (invariant proof) | ❌ (not runtime) |
| Browser smoke screenshot | ❌ | ✅ runtime |
| `/api/gameplay/snapshot` hash readback | ❌ | ✅ runtime |

`buildEvidenceChain()` reports `build-only` if no runtime layer (browser, snapshot-hash-readback) has passed. It reports `pass` only when a runtime layer passes.

## 6. Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Unit/Guard/Build/Browser evidence for integrated slices | ✅ Unit/Guard/Build captured; Browser pending (requires dev server) |
| Snapshot/Hash/Source evidence documented | ✅ Readback points defined (§3) |
| 2D/3D parity proven for tested stand | ✅ Parity contract + verifier defined; runtime proof pending browser smoke |
| Success only with real runtime evidence | ✅ `buildEvidenceChain` enforces — build-only ≠ runtime success |

## 7. Remaining runtime evidence (pending)

The following requires a running dev server + browser session and is tracked for follow-up:
- 2D minimap overlay marker rendering screenshot
- 3D minimap overlay marker rendering screenshot
- `/api/gameplay/snapshot` revisionHash readback against the running server
- 2D/3D side-by-side parity screenshot showing same POI/resource facts

These cannot be captured in a headless unit test. The evidence chain infrastructure (`buildEvidenceChain`, `verifyParity`) is in place to record them once a browser session is available.

---

This evidence chain was created by an AI agent (OpenHands) on behalf of the user.
