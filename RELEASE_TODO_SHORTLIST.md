# Release Todo Shortlist

This file is a release gate, not a decorative checklist. A row may only move to `ready` when the listed source proves it. Unknown or blocked work must stay visible.

| Gate | Status | Runtime/source check | Notes |
| --- | --- | --- | --- |
| Real GLB assets | blocked | `game-data/assets` + model-path audit + published content manifest | Missing or unlicensed assets cannot be hidden behind generated placeholders. |
| Production database | blocked | deployment secret + persistence health endpoint + backup restore proof | Local/file persistence is acceptable only for development. |
| Auth and session flow | blocked | authenticated login/session smoke + protected admin routes | Dev auth must stay outside the truth path. |
| Combat/skill balance | unknown | combat tick test + balance fixture report | Needs deterministic fixture, not subjective manual pass. |
| UI polish | unknown | client smoke + accessibility pass + visible blocked/unknown states | UI may render side channels, but must not invent runtime truth. |
| Live persistence test | blocked | save/load/replay run with state hash continuity | Green only after replay verification. |
| GM and role checks | blocked | admin/GM route authorization tests | No unauthenticated admin control surfaces. |
| Deployment rehearsal | blocked | release smoke gate on deployed target | Must prove health, websocket, snapshot, auth, and rollback path. |

## Gate rule

```text
ready = source exists + check passes + no fake snapshot/stub stands in the truth path
unknown = source missing or not wired to this gate yet
blocked = source/check proves the release criterion is not satisfied
```

## Next executable checks

1. Run the module scanner with JSON output: `node scripts/analyze-modules.mjs --json > reports/module-analysis.json`.
2. Run the determinism guard against changed runtime files.
3. Run the full-loop release smoke gate before cutting any public release.
