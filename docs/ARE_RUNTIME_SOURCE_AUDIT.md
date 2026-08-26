# ARE Runtime Source Audit

This audit records whether the current release path can prove runtime truth through real ARE sources. Unknown and blocked states are intentional: they prevent a release gate from turning green through placeholders.

| Source | Status | Required proof | Current evidence path |
| --- | --- | --- | --- |
| Tick source | ready | Server tick ID is the canonical execution clock. | `WorldTickScheduler`, 10 Hz snapshots, tick-bound protocol docs. |
| Chunk source | unknown | Runtime chunk key must be carried with server-visible world data. | WebSocket snapshot examples carry chunk coordinates, but this audit still needs a CI assertion over runtime snapshot payloads. |
| Kappa1000 / deterministic seed | unknown | Gameplay decisions must derive from tick/seed/kappa input, not wall-clock or ambient randomness. | Determinism docs exist; module scanner JSON now exposes remaining non-deterministic patterns for gating. |
| Hash source | ready | Snapshot/event/catchup payloads include deterministic state/event hashes. | WebSocket protocol documents `stateHash`, `previousStateHash`, `payloadHash`, `eventHash`, and `summaryHash`. |
| Server status | unknown | Health/admin status must distinguish dev side channels from truth path. | Release gate requires protected auth/admin checks before marking ready. |
| Client display | unknown | Client UI must show blocked/unknown instead of inventing runtime truth. | `AdminAudit` now renders explicit `unknown` state; navigation now reports blocked without navmesh. |

## Gate contract

```text
ready   = runtime source exists + deterministic check passes + replay/hash evidence exists
unknown = the source may exist, but this audit cannot prove it yet
blocked = source/check proves the release criterion is not satisfied
```

## Current blockers

1. Add CI assertions for snapshot chunk/hash continuity.
2. Attach the admin audit UI to a live audit endpoint instead of default `unknown`.
3. Run `node scripts/analyze-modules.mjs --json=reports/module-analysis.json` and publish the report as a workflow artifact.
4. Keep dev/auth stubs explicitly outside the truth path.
