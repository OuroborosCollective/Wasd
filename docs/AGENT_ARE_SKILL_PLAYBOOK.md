# Agent ARE Skill Playbook

This playbook tells agents how to work in Areloria/WASD without damaging the architecture. It is distilled from conversation archives, PR reviews, CI failures and merged refactor work.

## First rule

```text
Read current code and current docs before writing new code.
Do not trust old conversation snippets over active repository state.
```

## Required mental model

```text
No Snapshot, no game.
No Tick, no truth.
No Guard, no architecture.
No /2d proof, no integration.
```

## What agents must avoid

```text
- direct expansion of server/src/core/WorldTick.ts
- broad rewrites of unrelated modules
- hidden Date.now()/Math.random() in simulation code
- client-authoritative gameplay state
- disconnected demo UI pretending to be integration
- raw conversation dumps in docs
- secrets, tokens, VPS credentials or env files in commits
- Dockerfile.prod assumptions for VPS deploy
- 3D build gates in 2D-only release work
- silent CI soft-fails with `|| echo`
```

## Branch and PR practice

```text
1. Create a focused branch.
2. Keep PRs small enough to review.
3. Include docs when architecture changes.
4. Include nearest tests/guards.
5. Do not claim green until current head checks are green.
6. Use squash merge for messy agent histories.
7. Never push raw private logs or conversation ZIPs.
```

## Reading order for agents

```text
README.md
docs/START_HERE.md
docs/ARELORIA_CODE_TRUTH_MANIFEST_2026_06.md
docs/ARE_MODULE_IMPLEMENTATION_STANDARD.md
docs/CONVERSATION_DERIVED_PROJECT_RULES_2026_06.md
docs/CONVERSATION_ARCHIVE_SYNTHESIS_2026_06.md
docs/AGENT_FEATURE_PR_POLICY.md
```

## New module skill

When asked to add a module, always shape it as:

```text
Types
Ports
TickSystem
Delta
Replay sink
Snapshot/manifest sink
Tests
Docs
```

Then ask whether UI proof belongs in the same PR or a follow-up PR. Do not create a hidden service that never reaches `/2d`.

## Legacy resolution skill

When an old term appears, translate it before coding:

| Old / risky term | Canonical target |
| --- | --- |
| `WorldTick.ts` as extension point | `WorldTickScheduler` + `TickSystemRegistry` |
| `worldBrain.tick()` after registry | `WorldBrainTickSystem` registered in registry |
| route reads `tick.tickCount` | `TickSystemContextProvider` or snapshot/read port |
| `SpatialBroadcastGrid` local math | `UnifiedChunkContract` + `InterestGrid` |
| direct DB write in tick | write-behind persistence queue |
| client mutation | server intent route + authoritative snapshot |
| real-time API in tick | external adapter + deterministic input event |

## Review-comment skill

Do not blindly apply review comments. Judge them against the manifest:

```text
Does it preserve determinism?
Does it preserve server authority?
Does it feed snapshot/replay/manifest?
Does it reduce legacy WorldTick coupling?
Does it avoid broad scope creep?
```

Apply comments that fix real correctness, compile, guard or proof-path issues. Push back on comments that reintroduce legacy architecture or speculative complexity.

## CI triage skill

When a workflow fails:

```text
1. Identify current PR head SHA.
2. Ignore failures from older heads.
3. Fetch the failed job log.
4. Patch the smallest real cause.
5. Re-check only current-head runs.
6. Report success only when checks are complete.
```

Common failure classes from recent archives:

```text
- isolatedModules requires `export type`
- branded ChunkKey/KappaInt tests using raw string/number
- stale route signatures after TickSystemContextProvider migration
- architecture lint catches Date.now/Math.random in core
- guard:all accidentally hard-fails intended red baseline audit
- wiki workflow syncs docs/wiki without building .wiki-build first
```

## Documentation skill

When importing conversation knowledge:

```text
Summarize rules.
Remove secrets.
Remove temporary agent chatter.
Normalize old names to canonical names.
Point to active code/docs.
Do not store raw exports.
```

## Done statement template

A useful final report says:

```text
Changed:
- files touched
- rules encoded
- wiki sync impact

Verified:
- commands/checks run or not run
- current PR link
- remaining risk
```

Never write “green” unless the current head actually has green required checks.
