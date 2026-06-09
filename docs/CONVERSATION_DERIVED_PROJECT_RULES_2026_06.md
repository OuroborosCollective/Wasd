# Conversation-derived project rules — June 2026

This document distills useful project knowledge from imported conversation event ZIPs. It is not a raw chat archive. It is a cleaned, repo-safe working summary for agents and maintainers.

Use this document as secondary context after current code and canonical docs. If this document conflicts with active code, tests, or newer docs, the active repository wins.

## Import scope

Reviewed local conversation exports matching `conversation_*.zip`.

Observed recurring themes:

- server-authoritative gameplay contracts
- deterministic ARE/Ouroboros simulation rules
- `/2d` live-client integration requirements
- Cyber-Zen / Stitch visual language
- asset intake and quarantine-first rules
- VPS/Docker deployment conventions
- agent/PR workflow discipline
- SelfHeal/AutoRepair safety boundaries
- economy, NPC, quest, memory, rumor and asset pipeline steps

Sensitive material from historical conversations is intentionally excluded. Do not commit credentials, API keys, passwords, server secrets, private asset licenses, or raw conversation dumps.

## Highest-priority rules

### 1. Server authority is non-negotiable

Gameplay state must follow this chain:

```text
client sends intent
server validates
server mutates
server emits snapshot/event
client renders
```

The client must not authoritatively mutate inventory, wallet, equipment, character stats, quest state, combat, loot, NPC memory, reputation, rumor state, economy state, or persistence state.

Failed validation must not partially mutate state.

### 2. Determinism rules

Gameplay and runtime manifests must avoid unstable state sources.

Forbidden for gameplay causality:

```text
Math.random()
Date.now()
performance.now()
crypto.randomUUID()
UUIDs for deterministic gameplay IDs
wall-clock timestamps in runtime manifests
unordered object iteration where order affects state
```

Allowed only for logs, diagnostics, CI metadata, build metadata, and human-facing non-gameplay reports:

```text
wall-clock timestamps
human diagnostic IDs
temporary debug metadata
```

Preferred deterministic sources:

```text
logical tick / logicalIndex
stable seed
stable content hash
row-major frame order
sorted traversal
stable JSON formatting
schemaVersion
server-issued event IDs
```

### 3. `/2d` is the real proof path

A feature is not done just because it exists as a static preview or detached demo page.

For gameplay-visible work, require proof in the real `/2d` path:

```text
/2d boots
real UI panel appears
data comes from server snapshot or sanctioned static asset manifest
no fatal overlay
stable data-testid exists
Playwright or smoke test covers it where practical
```

Do not create disconnected prototype pages unless the task explicitly asks for a prototype.

### 4. Cyber-Zen / Stitch visual language

Use the existing Cyber-Zen / Arelorian Stitch aesthetic for in-game panels and previews.

Expected vocabulary:

```text
dark cyber panel
thin neon border
cyan / fire / violet / green accents
monospace metadata labels
compact status badges
card-like blocks
Ouroboros / 10Hz / deterministic HUD feeling
```

Design should feel integrated with the current `/2d` UI, not like default browser HTML.

### 5. Asset pipeline is quarantine-first

Generated assets must not be blindly accepted.

For Stitch / atlas / external packs:

```text
raw input stays separate
runtime output is generated deterministically
sourcePath must be stable, not /tmp/...
manifest entries must be sorted
frame order is row-major
asset IDs are lower snake_case and stable
checkerboard/background cleanup must report confidence
bad or suspicious sheets go to quarantine/manual_review
visual contact sheets or reports are strongly preferred
```

For large generated assets, choose one of these strategies clearly:

```text
commit small required runtime manifests only
commit required sample assets only
upload large generated output as CI artifact
use Git LFS or external asset storage if repository policy allows
regenerate from raw ZIP during CI/deploy
```

Do not let a manifest point to image/atlas files that are missing in a fresh checkout or build artifact.

## Step ladder captured from conversations

The imported conversations repeatedly used a sequential step approach. Keep future work similarly narrow and merge one reliable layer at a time.

| Step | Theme | Current rule of thumb |
| --- | --- | --- |
| 1 | `/2d` boot path | boot must be observable and non-blank |
| 2 | live render audit | visible runtime path beats static previews |
| 3 | inventory + paperdoll | playable equip/unequip, server authoritative |
| 4 | equipment stats | stats visible in snapshot/UI, no duplicate logic |
| 5 | resource economy loop | gather → process/craft → sell → XP/wallet |
| 6 | NPC resource quest loop | NPC gives task and tracks server-side progress |
| 7 | NPC memory/reputation UI | Cyber-Zen UI shows trust and memory signals |
| 8 | persistent memory + rumors | memory persists and rumor summaries spread deterministically |
| 9 | Stitch 2.5D asset intake | convert ZIPs into accepted/manual_review/quarantine assets |

Future steps should continue this pattern: small branch, concrete proof path, tests, docs, then merge.

## Agent / PR workflow rules

Agents should follow this operating mode:

```text
1. Do not work directly on main.
2. Create a focused branch with a truthful name.
3. Read current docs and active code first.
4. Search for existing systems before adding new ones.
5. Do not create duplicate PRs for closed/superseded work.
6. Keep each PR scoped to one step or one hardening pass.
7. Update docs in the same PR.
8. Run nearest valid verification commands.
9. Do not claim green if checks were skipped or softened.
10. Merge only after workflows are green or the remaining risk is explicitly accepted.
```

Good PR body sections:

```text
Summary
Changed files
Runtime proof path
Determinism notes
Verification commands
Known limitations
Follow-up work
```

Avoid misleading PR titles. The title should match the actual layer being changed.

## Deployment and VPS conventions

Important project convention from repeated conversations:

```text
Production Dockerfile: Dockerfile.vps
VPS path: /opt/areloria
3D client may be paused; do not accidentally require it for 2D-only smoke gates
```

Do not silently switch deployment to `Dockerfile.prod` unless the repository has intentionally changed that convention.

For public route smoke tests, ensure generated public routes and runtime entrypoints match the build output.

## SelfHeal / AutoRepair safety boundary

SelfHeal is useful only when controlled.

Allowed shape:

```text
observe
classify
propose patch
dry-run
risk score
human-readable patch proposal
rollback plan
bounded apply
log decision
```

Avoid:

```text
unbounded autonomous mutation
silent production patching
repair without rollback
auto-merge without tests
large speculative rewrites
```

SelfHeal must remain deterministic where it affects gameplay or persistent state.

## Economy / NPC / social systems contract

Resource, crafting, trade, quest, NPC memory, reputation and rumor systems should share these rules:

```text
server-side validation
idempotent event application
stable event IDs
no duplicate rewards
stable objective ordering
snapshot-readable state
client renders only
failed validation has no mutation
```

NPC/social behavior should be explainable from persisted memory, reputation, quest state, and deterministic rumor records. Do not add broad black-box AI behavior before the deterministic state layer is solid.

## Documentation hygiene

When importing conversation knowledge into docs:

```text
do summarize useful rules
do remove secrets
do remove credentials
do remove temporary agent chatter
do normalize old prompts into current repo language
do point to active docs/code instead of duplicating everything
```

Do not store raw conversation exports in the public repository.

## Suggested follow-up docs

Potential future doc improvements:

```text
docs/AGENT_PR_PLAYBOOK.md
docs/DETERMINISM_GUARDRAILS.md
docs/ASSET_INTAKE_QA_PLAYBOOK.md
docs/VPS_DEPLOYMENT_CONTRACT.md
docs/CYBER_ZEN_UI_STYLE_GUIDE.md
```

These should be created only when they help active development and are kept short enough for agents to actually read.
