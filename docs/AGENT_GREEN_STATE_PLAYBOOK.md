# Areloria Green-State Agent Playbook

This playbook captures practical lessons from recent agent-assisted GitHub work on Areloria/WASD.

It is not a theory document. It is a working checklist for keeping automated and semi-automated changes aligned with real runtime truth.

## Purpose

Agent-assisted work is useful only when it improves the real project state.

A green check is not enough by itself. The change must preserve deterministic causality, server authority, runtime snapshots, and clear side-channel boundaries.

Use this playbook before reviewing, fixing, merging, or closing any PR or issue.

## Non-negotiable truth boundary

A gameplay feature counts only when it is connected to a real runtime path.

Accepted sources of truth:

```text
server tick
logical index
chunk or region key
Kappa1000 / branded deterministic coordinates
state hash or stable content hash
server runtime services
server-authored snapshot segments
explicit replay input
stable sorted traversal
```

Not accepted as truth:

```text
client-local gameplay state
UI-only state changes
mock snapshots
stub systems pretending runtime integration
workflow-only success
unreviewed direct main pushes
unbounded scans in the tick path
```

Debug overlays, telemetry, reports, and diagnostics are allowed only as side-channels. They must not become gameplay authority.

## PR workflow checklist

Before touching code:

```text
1. Read the issue acceptance criteria.
2. Read the PR body and changed files.
3. Inspect the actual patch, not only the summary.
4. Identify the runtime truth path.
5. Identify the side-channel path.
6. Identify the CI gates that matter for the change.
```

During fixes:

```text
1. Use a branch, not direct main.
2. Prefer small commits with one purpose.
3. Fix the root cause, not the workflow symptom.
4. Keep generated artifacts out of commits unless intentional.
5. Avoid broad rewrites when a narrow truth fix is enough.
6. Keep server authority ahead of client rendering.
```

Before merge:

```text
1. Verify the current PR head.
2. Verify required CI gates on that exact head.
3. Do not treat skipped draft-only checks as green unless the PR state explains it.
4. Squash merge with expected head SHA when possible.
5. Comment on linked issues with the merge SHA and actual completed scope.
6. Close issues only when their acceptance criteria are complete.
```

## CI gates that matter

Common gates that caught real bugs:

```text
Jules Deterministic Audit / server typecheck
Safe Test Lab
Architecture Lint
Monorepo Guard
AST / static analysis
Portal Runtime Smoke
VPS Docker build through Dockerfile.vps
Client 2D build smoke
Autonomous CI Layer, when applicable
```

A failing CI job is a signal, not an inconvenience. Do not bypass it with workflow edits unless the workflow itself is demonstrably the bug and the fix preserves stricter truth.

## Determinism guard practices

Gameplay and simulation code must use explicit deterministic inputs.

Use:

```text
authoritative tick
logical index
chunk key
entity id
target id
world seed
stable hash
explicit server runtime state
```

Avoid ambient time, host identity, process entropy, or unordered iteration where order changes state.

Guard scripts may scan text as well as code. Keep comments in changed gameplay files free of forbidden API spellings when the guard is token-based. Write comments around the rule instead of spelling the dangerous call.

## Runtime snapshot rules

A snapshot field is real only when the production route generates it.

Good pattern:

```text
server runtime services
→ deterministic resolver / composer
→ snapshot segment
→ client render-only consumer
```

Bad pattern:

```text
unit test creates segment
production route leaves segment undefined
client invents local display truth
```

For every new snapshot segment, verify:

```text
1. The production route supplies it.
2. The composer preserves stable ordering.
3. The client validates or safely narrows it.
4. The client renders only; it does not author gameplay truth.
5. Tests cover empty, populated, and deterministic repeated input cases.
```

## Atomic transition rules

For inventory, equipment, wallet, quest, skill, building, or ownership mutations:

```text
1. Read current authoritative state.
2. Validate all requirements before mutation.
3. Derive next state as pure values.
4. Persist or commit in a reviewed order.
5. Replace in-memory state only after the commit path succeeds.
6. Add late-failure tests.
```

Tests should cover:

```text
happy path
invalid input
requirements rejected
persistence failure
replacement failure
no partial mutation
identical input produces identical output
stable ordering
```

## Client rendering rules

The client may render, request, and display.

The client must not author inventory, equipment, NPC activity, quest state, skill state, economy state, loot truth, wallet truth, or persistent world state.

For DOM overlays and debug panels:

```text
use text nodes or textContent for snapshot text
avoid raw HTML injection from snapshot fields
read the actual network event shape
keep debug overlays separate from release truth
```

## Import and type hygiene

Common failure points:

```text
wrong relative imports after adding files under server/src/gameplay
barrel export name collisions
package entry resolution before workspace build
broad type aliases hiding schema mistakes
client protocol shape mismatch
```

Best practice:

```text
prefer source-local imports that match runtime layout
build workspace packages before server typecheck when needed
avoid ambiguous barrel exports
keep protocol validators aligned with emitted events
```

## Issue hygiene

An issue can be closed as completed only when the actual acceptance criteria are complete.

If a PR completes only a slice, leave the parent issue open and add a status comment.

Good issue comment:

```text
Completed by #PR
Merge SHA: <sha>
Completed scope: <specific bullets>
Remaining scope: <specific bullets>
Closure decision: completed / keep open
```

If an issue was closed too broadly, reopen it. Correct state matters more than appearances.

## GitHub connector lessons

Helpful sequence:

```text
get PR info
list changed filenames
fetch patch or per-file patch
fetch CI runs for current head
fetch failed job logs
patch root cause
re-check exact head
merge with expected head SHA
comment and close only what is complete
```

Avoid:

```text
branch creation loops
claiming work before a commit exists
merging while checks are still running
closing umbrella issues after only a partial slice
```

When branch creation behaves oddly, stop and verify the branch list or use one clean unique branch name. Do not keep creating numbered branches.

## Recent proven patterns

### Route truth

Route registry claims must match mounted runtime routes. Probes should verify real behavior, not just expected docs.

### Equipment truth

Atomic equip and unequip work best with staged next states. Requirement validation belongs before transaction planning. Server skill state is the source for authored equipment requirements.

### NPC activity truth

NPC activity must be generated by the gameplay snapshot route, not only by tests. The 2D overlay renders snapshot data and must not invent activity state.

### Snapshot safety

A snapshot is not automatically safe because it comes from the server. Client rendering should still avoid raw HTML injection and validate protocol shape.

## Review mantra

```text
Does this change make the real runtime more truthful?
Does the server own the state?
Is the calculation deterministic from explicit inputs?
Is the client only rendering?
Do tests prove failure paths, not only happy paths?
Did CI pass on the exact head being merged?
```

If the answer is no, keep working.