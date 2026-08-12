# Donor License & Asset Safety Matrix (#2468)

**Date:** 2026-08-11
**Scope:** CloudCraft integration #2468 — audit donor license, media provenance, and asset transfer safety.

## 1. Donor repository pin

| Property | Value |
|----------|-------|
| Repo | `cloudcraft-donor` |
| Branch | `main` |
| Commit | **not-pinned-yet** |
| Pinned date | 2026-08-11 |

**⚠ The donor repo, branch, and commit are NOT pinned.** All transfers are blocked until pinned. See `DONOR_REPOSITORY_PIN` in `packages/shared/src/world/DonorLicenseSafetyMatrix.ts`.

## 2. License separation rule

> **MIT-Codefreigabe ist keine pauschale Medienfreigabe.** Code-Lizenz und Medien-Lizenz werden niemals vermischt.

- **Code license:** Must be evaluated separately per donor code module. The repository `LICENSE` is a **strict proprietary notice** (not MIT).
- **Media license:** Per-asset provenance required. No bulk import of art/audio/fonts/models under the assumption that MIT applies to everything.

## 3. Asset license class matrix

| Class | Allowed | Attribution required | Commercial use | Redistribution |
|-------|---------|----------------------|-----------------|----------------|
| `permissive` (CC0, MIT) | ✅ | ❌ | ✅ | ✅ |
| `attribution` (CC-BY, OFL) | ✅ | ✅ | ✅ | ✅ |
| `non-commercial` (CC-BY-NC) | ❌ BLOCKED | ✅ | ❌ | ❌ |
| `project-only` (custom) | ❌ BLOCKED | ✅ | ❌ | ❌ |
| `permission-required` | ❌ BLOCKED | ✅ | ❌ | ❌ |
| `unknown` (no provenance) | ❌ BLOCKED | ✅ | ❌ | ❌ |

**Blocked classes:** `non-commercial`, `project-only`, `permission-required`, `unknown`.

## 4. Donor candidate inventory

| ID | Category | License class | Source verified | Binary status | Transfer allowed |
|----|----------|---------------|-----------------|---------------|-----------------|
| kenney-ui-pack | media | permissive (CC0) | ✅ | imported | ❌ (repo not pinned) |
| kenney-tiny-town | media | permissive (CC0) | ✅ | blocked | ❌ (repo not pinned + import blocked) |
| kenney-tiny-dungeon | media | permissive (CC0) | ✅ | blocked | ❌ (repo not pinned + import blocked) |
| ninja-adventure | media | permissive (CC0) | ✅ | blocked | ❌ (repo not pinned + import blocked) |

All four candidates have CC0 (permissive) provenance, but **none are transfer-allowed** because:
1. The donor repo is not pinned.
2. Three have `binary_import_blocked` status.

## 5. Evaluation rules

`evaluateDonorCandidate(candidate)` returns `{ allowed, reason }`:
1. If donor repo commit is `not-pinned-yet` → `donor_repo_not_pinned`
2. If category is `media` and no provenance → `media_missing_provenance`
3. If provenance license class is blocked → `license_class_blocked:<class>`
4. If source not verified → `source_not_verified`
5. Otherwise → allowed

## 6. Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Safety-matrix for donor-code vs donor-media exists | ✅ `DonorLicenseSafetyMatrix.ts` |
| Blocked asset classes explicitly listed | ✅ `BLOCKED_ASSET_CLASSES` |
| Only robustly-approved transfers remain as valid candidates | ✅ All blocked while repo unpinned |
| Code license and media license never mixed | ✅ `LICENSE_SEPARATION_RULE` |
| No asset transfer without robust provenance | ✅ `evaluateDonorCandidate` enforces |
| No implicit freedom from root license file | ✅ Repository is proprietary, not MIT |

## 7. Tests

11 tests in `DonorLicenseSafetyMatrix.test.ts` prove:
- Blocked classes are listed and flagged correctly.
- Permissive/attribution classes are allowed.
- All transfers blocked while donor repo is unpinned.
- Media without provenance is blocked.
- Media with blocked license class is blocked.
- License separation rule is explicit.
- Audit records are frozen.

---

This audit was created by an AI agent (OpenHands) on behalf of the user.
