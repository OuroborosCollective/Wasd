# 2D/3D Product + Playtest Truth Gate

Status: AIM-132 / GitHub #2574 implementation candidate.

This gate exists to stop visual or workflow "green" from outrunning runtime truth. It does not generate screenshots, mock world state, or synthesize a passing evidence manifest.

## One world truth

Both projections must prove the same authoritative runtime readback:

- exact 40-hex deployed/reviewed Git revision;
- same non-zero 64-hex world hash;
- same tick;
- `rateHz = 10`;
- `durationMs = 100`.

A 2D/3D world-hash or tick mismatch is a hard failure.

## Required real-play scenarios

For **both** `client2d` and `client3d`, evidence must include a non-empty PNG screenshot plus a short observed-state note for:

1. `first-actionable-screen`
2. `movement`
3. `interaction`
4. `quest-inventory`
5. `desktop`
6. `mobile`
7. `resize`

The DOM HUD and Pixi/Babylon renderer layers must also be reviewed separately.

## Evidence manifest

The checker consumes a runtime-produced JSON manifest. Default path:

```text
artifacts/runtime-playtest/2d3d-evidence.json
```

It can be overridden with `PLAYTEST_EVIDENCE_MANIFEST` or the first CLI argument. When `EXPECTED_COMMIT_SHA` or `GITHUB_SHA` is present, the manifest revision must match it exactly.

Minimal shape (field names only; this is **not** passing evidence):

```text
revision
projections.client2d.worldHash
projections.client2d.tick
projections.client2d.rateHz
projections.client2d.durationMs
projections.client2d.scenarios.<required-scenario>.screenshot
projections.client2d.scenarios.<required-scenario>.observed
projections.client3d.<same fields>
domHudReviewedSeparately
rendererLayersReviewedSeparately
```

## Run

```bash
node scripts/verify-2d3d-playtest-evidence.mjs
```

The command must fail when evidence is missing, empty, from another revision, non-canonical, or divergent between 2D and 3D.

## Green rule

Repository inspection is not visual evidence. Unit tests are not browser evidence. A screenshot without runtime revision/world/tick provenance is not sufficient evidence. Visual Green requires the complete runtime-produced evidence set to pass this checker.

Until the project has a browser runner in this execution environment, this gate can be installed and reviewed, but it must remain unproven rather than receiving synthetic screenshots.
