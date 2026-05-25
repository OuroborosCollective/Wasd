# Areloria Agent Skillbook

This file is the shared working contract for future coding agents in the WASD / Areloria repository.

## Core rule

Build emergence through deterministic world laws, not hard behavioral cages.

## PR chain protocol

1. Check the previous PR status.
2. If it is merged, branch from current main or the merge commit.
3. Keep one PR to one architecture layer.
4. Do not mix pure logic, mutation, WorldTick routing, rewards, resonance, and UI in one PR.
5. Always name the next follow-up layer in the PR body.

Preferred order:

```txt
pure module
adapter
NPCSystem commit point
WorldTick event surface
reward consequence
resonance echo
portal or client visualization
```

## Emergence over forced behavior

Wrong:

```txt
critical energy -> force one action
```

Right:

```txt
critical energy -> survivalBias + risk + consequence projection
```

NPCs should keep autonomy. The world should answer with measurable consequences.

## Pure logic before mutation

Use this shape whenever possible:

```txt
EmergentBrain
-> ThermalLogic
-> EmergentThermalAdapter
-> NPCSystem
-> WorldTick
-> Reward / Echo / Visual
```

Adapters return audit data. Commit points mutate state.

## Deterministic event language

World events should be explicit payloads. Include as many of these fields as apply:

```txt
eventType
sourceId or npcId
factionId
position or kappa coordinate
tick
reason
risk
sourceAction
state or energy delta
kappaHash
```

Do not add rewards, faction mood changes, or UI effects before the event payload exists.

## GitHub connector safety mode

If a tool call is blocked:

1. Keep the same technical intent.
2. Use calmer branch and PR names.
3. Avoid dramatic language in branch names, commit messages, and PR bodies.
4. Preserve existing constants if already in code.
5. Retry with neutral wording.

## WASD monorepo style

Before editing:

1. Fetch the actual file from main.
2. Respect import style, especially `.js` runtime suffixes.
3. Keep changes minimal.
4. Add tests for new logic.
5. Avoid new dependencies unless necessary.
6. Prefer stable ordering and deterministic hashes.

## Agent Learnings

### Documentation-only learning PRs

Context: When a task asks to persist reusable agent knowledge, keep it separate from runtime fixes.

Rule:

- Use a small docs-only branch and PR.
- Update `docs/agents/ARELORIA_AGENT_SKILLBOOK.md` first.
- Touch `.github/copilot-instructions.md` or `.cursor/rules/areloria-agent-skillbook.mdc` only for short routing reminders.
- Do not include source-code fixes in the same PR unless explicitly requested.

Anti-pattern:

```txt
fix runtime bug + rewrite agent rules + update cursor rules in one PR
```

Recommended PR layer: agent knowledge / documentation.

Test requirement: No runtime tests are required for docs-only changes. Verify Markdown structure and that the instructions remain agent-readable.

### Reusable error documentation format

Context: Concrete incidents should teach future agents without turning one-off logs into permanent doctrine.

Rule: Document repeatable failures with this shape:

```txt
Symptom: observable failure text or behavior.
Cause: general root cause, not only the one incident.
Safe diagnosis: command, file, log, or invariant that proves it.
Recommended fix: minimal repeatable repair.
Affected paths: likely files, workflows, scripts, or deployment surfaces.
```

Anti-pattern:

```txt
Today deployment failed because commit abc123 was broken.
```

Recommended PR layer: field note or agent learning.

Test requirement: Link the learning to the diagnostic command or affected path when possible.

### Architecture learning format

Context: Architecture notes must protect emergence and determinism without freezing NPC behavior.

Rule: Document reusable architecture guidance with this shape:

```txt
Context: where the rule applies.
Rule: what future agents must do.
Anti-pattern: what must not be introduced.
Recommended PR layer: the correct layer in the chain.
Test requirement: what proves deterministic behavior.
```

Anti-pattern:

```txt
NPCs must always pick action X when condition Y happens.
```

Recommended PR layer: pure module, adapter, commit point, WorldTick event surface, reward consequence, resonance echo, or portal/client visualization.

Test requirement: Prefer deterministic unit tests for pure logic and event-shape tests for WorldTick surfaces.

## Current ladder

```txt
#1198 EmergentBrainKernel
#1199 ThermalLogic
#1200 EmergentThermalAdapter
#1201 Autonomous Thermal Risk Model
#1202 World Event Payload
#1203 NPCSystem Integration
#1204 WorldTick Event Surface
#1205 Deterministic Event Rewards
#1206 Resonance Echo
#1207 Portal / Client Visualization
```

## Fast command semantics

```txt
los / weiter / ok weiter / zuegig
-> verify status, branch, patch, PR, short report

ist gemerged
-> verify PR, continue next layer

mach das ins repo
-> make a branch and PR, do not only write a prompt
```

## Design contract

- No random decisions where deterministic scoring works.
- Preserve NPC autonomy unless the world state is final.
- Make consequences auditable.
- Surface events in WorldTick before rewards, mood, or visuals.
- Keep the world stateless where possible.
- Commit only explicit state transitions.
