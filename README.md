# Areloria WASD

**Areloria WASD** is a browser-native deterministic MMORPG engine and living-world simulation platform.

The current release path is **2D-first**: a server-authoritative Node.js game server, a Pixi-style `/2d` client surface, Cyber-Zen/Stitch UI panels, deterministic 10Hz gameplay rules, NPC memory/reputation/rumor systems, resource economy loops, and a quarantine-first asset intake pipeline for generated 2.5D sprite atlases.

The 3D client remains part of the repository, but it is not the active release gate unless a task explicitly says otherwise.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Runtime](https://img.shields.io/badge/runtime-deterministic_10Hz-blue)
![Client](https://img.shields.io/badge/client-2D_first-cyan)
![Simulation](https://img.shields.io/badge/simulation-ARE_logic-purple)
![License](https://img.shields.io/badge/license-proprietary_all_rights_reserved-red)
<img alt="open collective badge" src="https://opencollective.com/ouroboros-collective-are/tiers/backers/badge.svg?label=backer&color=brightgreen" />

> This repository is proprietary. It is not MIT licensed. See [License and usage policy](#license-and-usage-policy).

---

## Current project state

Areloria is no longer only a shell or prototype. The repository now contains a playable deterministic browser-MMORPG foundation with these active layers:

```text
/2d runtime path
server-authoritative gameplay snapshots
resource gather/process/sell economy loop
NPC resource quest loop
Cyber-Zen NPC dialogue and reputation UI
persistent NPC memory and deterministic rumor summaries
Stitch 2.5D atlas intake pipeline
VPS-oriented Docker deployment path
```

Recent high-value systems:

| Area | Current status |
| --- | --- |
| Runtime client | `/2d` is the primary proof path; 3D is not the current release blocker |
| Server tick | 10Hz deterministic server-authoritative gameplay model |
| Economy | resource gathering, processing/crafting, selling, wallet/XP progression |
| NPC quests | Mira / village supply style NPC resource quest loop |
| NPC social layer | reputation, memory, persisted memory state and rumor network |
| UI style | Cyber-Zen / Arelorian Stitch dark-neon HUD language |
| Assets | Stitch 2.5D sprite atlas intake, manifest generation and quarantine-first QA |
| Deployment | VPS-oriented flow; production Docker file is `Dockerfile.vps` |

A feature is considered real only when it is visible or verifiable through the active runtime path, server state, generated manifest, or CI/smoke test. Detached demos do not count as production integration.

---

## Vision

Areloria is not designed as a simple web game shell. It is an attempt to build a mathematically disciplined, deterministic living-world engine for a browser MMORPG.

The world should feel inhabited rather than merely scripted. NPCs are future citizens, workers, traders, witnesses, political actors, enemies, allies, informants, settlers, rulers, rebels, and memory-bearing participants in a simulated civilization.

The long-term target is an emergent AI population governed by deterministic server logic:

- NPCs remember local events.
- NPCs react to player history.
- Villages, towns, cities, kingdoms, and lands can emerge from rules.
- Trade routes, taxes, elections, wars, scarcity, migration, and resource pressure become systemic forces.
- Oracle/prophecy systems observe repeated patterns and expose transparent world-thought to players.
- Simulation remains bounded by tick cadence, chunk observation, and replayable deterministic inputs.

Areloria is therefore both a game project and a simulation architecture project.

---

## Core principles

### 1. Server authority is non-negotiable

Gameplay state follows this chain:

```text
client sends intent
server validates
server mutates
server emits snapshot/event
client renders
```

The client must not authoritatively mutate inventory, wallet, equipment, character stats, quest state, combat, loot, NPC memory, reputation, rumor state, economy state, or persistence state.

Failed validation must not partially mutate state.

### 2. Determinism rules the simulation

Gameplay state must be reproducible from explicit inputs. Simulation code must not depend on process-local randomness or hidden wall-clock state.

Forbidden in gameplay/simulation causality:

```text
Math.random()
Date.now()
new Date()
performance.now()
randomUUID()
process uptime as gameplay input
host/container identity as gameplay input
unordered iteration where order changes state
```

Use instead:

```text
explicit logical tick / logicalIndex
ARE clock/time adapters
stable seeds from world facts
content hashes for generated assets
row-major frame order for atlases
stable sorted traversal
stable JSON formatting
```

Good seed parts:

```text
worldSeed | regionId | chunkId | tick | actorId | targetId | tableId | cycleId
```

### 3. ARE logic is the governing model

Areloria is built around the project’s ARE logic model: an axiomatic deterministic rule system intended to govern simulation flow, replayability, causality, pressure, observation, and bounded emergence.

Within this repository, ARE is treated as the governing logic layer for:

- deterministic time,
- deterministic randomness,
- world pressure,
- causal mutation,
- replay-safe state transitions,
- region and chunk rule enforcement,
- oracle/brain interpretation,
- protected simulation boundaries.

The broader ARE theory, formula language, manuscripts, trademarks, research notes, and commercial/political/industrial usage rights are reserved by the rights holder and are not granted by this repository.

### 4. Observation bounds reality

The world should not simulate every possible place at full cost forever.

```text
Only observed or relevant regions receive expensive simulation.
Unobserved regions decay, summarize, or sleep.
```

This keeps server load proportional to active player observation and relevant world pressure.

### 5. The 10Hz server tick is sacred

The authoritative server loop is designed around deterministic 10Hz logic.

Systems must declare:

- cadence,
- maximum work per tick,
- chunk/region scope,
- deterministic seed/time source,
- failure behavior,
- feature flag or registry entry,
- telemetry side-channel, if any.

No system may dump unbounded scans into the tick.

### 6. Protected structures stay protected

Areloria’s civilization and monetization design includes player-built assets and potentially paid construction energy.

Default rule:

```text
If uncertain, do not damage the structure.
```

NPCs, swarms, bosses, decay systems, watchdogs, and world events must not damage or destroy player-built, paid, or protected structures unless an explicit reviewed policy allows it.

---

## Active gameplay systems

### Player progression

- Classless progression inspired by open-skill MMORPG design.
- Stamina and skill use shape combat capability.
- Equipment, loot, region pressure, and mastery shape identity.
- Long-term design does not require a hard conceptual level ceiling.

### Resource economy

The current economy direction is a deterministic loop:

```text
gather resource
process/craft item
sell to NPC/vendor
receive wallet/XP/reputation effect
expose state through LiveGameplaySnapshot
```

Economy state must remain server-authoritative and idempotent.

### NPC quests, memory and rumors

NPC systems now move toward social consequence rather than simple dialogue popups:

- NPCs can expose quest state through live snapshots.
- NPC dialogue can show trust/reputation state.
- NPC memory can persist by player/NPC pair.
- Deterministic rumor records can summarize important social events.
- Rumors may affect tone and effective trust, but must not duplicate rewards.

Direct memory is stronger than rumor memory. Broad autonomous AI behavior should not be added before deterministic memory, reputation and persistence contracts are solid.

### Loot and item systems

- Diablo-like rarity and affix direction.
- Deterministic loot rolls through explicit RNG/seed flow.
- Smart loot and treasure tables must be replay-safe.
- Item generation cannot use host randomness in simulation.

### Combat

- Server-authoritative combat.
- Deterministic critical hits and damage calculations.
- Replay-safe loot drop rolls.
- Region threat and oracle pressure may affect outcomes through explicit state only.

### Warfronts, Oracle and brain/watchdog systems

These systems are planned or partially present as bounded deterministic layers:

- deterministic cycle timing,
- warning/prophecy output from explicit records,
- bounded low-frequency brain interpretation,
- fast-path watchdog checks,
- telemetry as side-channel observability rather than gameplay truth.

All simulation-affecting output must be deterministic, bounded, inspectable, and compatible with tick constraints.

---

## UI and asset direction

### Cyber-Zen / Arelorian Stitch UI

In-game panels and debug/preview tools should use the existing Cyber-Zen / Stitch visual language:

```text
dark cyber panel
thin neon border
cyan / fire / violet / green accents
monospace metadata labels
compact status badges
card-like blocks
Ouroboros / 10Hz / deterministic HUD feeling
```

Do not add unstyled default HTML panels to the real `/2d` path.

### Stitch 2.5D asset intake

Generated or external asset packs must go through a deterministic intake pipeline before runtime use.

Pipeline principles:

```text
raw input stays separate
runtime output is generated deterministically
sourcePath must be stable, not /tmp/...
asset IDs are lower snake_case and stable
frame order is row-major
manifest entries are sorted
bad or suspicious sheets go to quarantine/manual_review
large generated assets must not silently bloat the repository
```

Useful commands where available:

```bash
pnpm assets:stitch:intake
pnpm assets:stitch:intake:zip -- ./assets/raw/stitch/stitch_2.5d_enemy_sprite_atlas.zip
pnpm assets:stitch:validate
```

The active visual proof path is the `/2d` Stitch asset preview panel and `/2d-assets/stitch/manifest.json`.

---

## Engine architecture

### Monorepo layout

```text
apps/                 Application surfaces and API/client shells
apps/client-2d/       Active 2D browser client path
client/               3D client path; currently not the release gate
server/               Authoritative game server
packages/             Shared packages and core logic
projects/             Additional project modules and experiments
docs/                 Architecture, deploy, policy, and audit docs
scripts/              Build, deploy, audit, wiki, asset and validation scripts
.github/workflows/    CI, deploy, guardrail and wiki automation
```

### Runtime shape

```text
Browser /2d Client
  -> Host Nginx
  -> 127.0.0.1:3001
  -> arelorian-engine Docker container
  -> Node.js authoritative server
  -> Supabase/PostgreSQL, Redis, Soketi/Pusher-compatible services where enabled
```

Production port policy:

```text
ARELORIAN_PORT=3001
ARELORIAN_CONTAINER_PORT=3001
ENGINE_URL=http://arelorian-engine:3001
```

Public domain routing:

```text
arelorian.de -> host Nginx -> 127.0.0.1:3001 -> arelorian-engine:3001
```

See also:

```text
docs/DEPLOY_PORT_MAP.md
docs/NGINX_HOST_GATEWAY.md
```

---

## Development

### Requirements

```text
Node.js 22.x
pnpm 11.x preferred by packageManager; pnpm 9+ may work where CI allows
Python 3 + Pillow for Stitch atlas intake
Docker for production-style deploy testing
```

### Common commands

```bash
pnpm install
pnpm build:2d
pnpm dev:2d
pnpm guard:all
```

Targeted builds:

```bash
pnpm build:web
pnpm build:2d
pnpm build:3d
```

Use `build:3d` only when the task touches the 3D client.

Recommended server/client checks:

```bash
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/client-2d --if-present build
```

---

## Wiki and documentation automation

The repository keeps wiki source material in `docs/wiki/` and has an autonomous wiki builder under `scripts/wiki/`.

The intended wiki flow is:

```text
README.md / docs/*.md / docs/wiki/*.md / scripts/wiki/** changes
→ build autonomous wiki into .wiki-build
→ sync generated .wiki-build content to the GitHub wiki repository
```

The sync workflow must build first and sync second. Copying only `docs/wiki/**` is not enough because the generated wiki also depends on README, docs, package metadata, changelog and module maps.

Useful commands:

```bash
node scripts/wiki/build-autonomous-wiki.mjs --source docs/wiki --out .wiki-build --rebuild true
node scripts/sync-wiki.mjs
```

`sync-wiki.mjs` should use `.wiki-build` in CI when available and fall back to `docs/wiki` only for manual/simple syncs.

---

## Deployment

### VPS Docker deploy

Primary deploy workflow:

```text
GitHub Actions -> VPS Docker Deploy (monorepo)
```

Production Docker file:

```text
Dockerfile.vps
```

Do not silently switch production deploys to `Dockerfile.prod` unless the repository intentionally changes that convention.

Default production values:

```text
VPS project path: /opt/areloria
ARELORIAN_PORT=3001
ARELORIAN_DOCKER_NETWORK=areloria_arelorian-network
ARELORIAN_ENV_FILE=.env.docker
```

Runtime secrets are written to a VPS-local `.env.docker` file and loaded by Docker Compose. Do not commit runtime secrets.

After a successful deploy, verification should validate:

```text
/health
/client-config.json
/
/2d
container state
host port mapping
optional nginx config
recent engine logs
```

### Nginx host gateway

Host-level Nginx can be installed/updated with:

```bash
sudo ARELORIAN_DOMAIN=arelorian.de \
  ARELORIAN_WWW_DOMAIN=www.arelorian.de \
  ARELORIAN_PORT=3001 \
  bash scripts/install-nginx-host-gateway.sh
```

---

## Agent and contributor policy

Automated agents must follow:

```text
docs/AGENT_FEATURE_PR_POLICY.md
```

Hard rules:

- small PRs only,
- no unrelated lockfile churn,
- no hidden nondeterminism,
- no broad deploy changes inside gameplay PRs,
- no protected structure damage without explicit policy,
- every new simulation path must be covered by determinism guardrails,
- every heavy runtime feature must be feature-flagged and cadence-bounded,
- every player-visible gameplay feature needs a real `/2d` proof path where practical.

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

---

## Documentation map

Start with:

```text
docs/START_HERE.md
docs/PROJECT_STATUS_2026.md
docs/ROADMAP_TO_RELEASE.md
docs/ARELORIAN_PROJECT_KNOWLEDGE_BASE.md
```

Important focused docs include:

```text
docs/AGENT_FEATURE_PR_POLICY.md
docs/ARE_DETERMINISM_CLASSIFICATION.md
docs/ARE_TELEMETRY_SIDE_CHANNEL.md
docs/CLIENT_2D_LIVE_RENDER_AUDIT.md
docs/NPC_MEMORY_REPUTATION.md
docs/NPC_RUMOR_NETWORK.md
docs/STITCH_2_5D_ASSET_INTAKE.md
docs/ASSET_PIPELINE_CONTRACT.md
docs/DEPLOY_PORT_MAP.md
docs/NGINX_HOST_GATEWAY.md
```

Prefer active code and current docs over older historical notes.

---

## License and usage policy

This repository is proprietary and all rights are reserved by Ouroboros Collective / the project rights holder.

The repository is made available, where visible, for inspection, review, controlled development, and authorized collaboration only. No public, private, academic, commercial, industrial, political, organizational, or game-development use is granted unless a separate written license or authorization is issued by the rights holder.

This includes but is not limited to:

- computer games,
- simulation systems,
- AI agents,
- industrial control or planning systems,
- political or organizational decision systems,
- commercial tooling,
- derivative engines,
- forks, mirrors, clones, or replicas,
- use of the ARE logic model, formula language, manuscripts, or associated theory.

No license is granted for unauthorized copying, redistribution, training, integration, execution, publication, reverse engineering, derivative works, or commercial exploitation.

Any use of the ARE logic model, axiomatic formula system, deterministic architecture, proprietary terminology, manuscripts, or associated implementation patterns outside this repository requires prior written approval and a separate license from the rights holder.

Nothing in this README should be read as legal advice or as a statement that a patent, trademark, copyright registration, scientific certification, or statutory monopoly has already been granted in every jurisdiction. The project asserts ownership and reserved rights to its code, documentation, terminology, research material, formulas, and implementation architecture to the maximum extent available under applicable law and contract.

See `LICENSE` for the repository license terms.

---

## Status

Areloria WASD is under active development.

The current priority is to keep the engine deterministic, deployable, 2D-playable, asset-pipeline-safe, and ready for a living browser MMORPG with social NPC memory and protected player civilization systems.

The world may become strange, but never nondeterministic by accident.
