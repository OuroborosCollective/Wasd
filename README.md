# Areloria WASD

**Areloria WASD** is a browser-native deterministic MMORPG engine and living-world simulation platform.

It combines a 10Hz authoritative Node.js game server, Three.js/WebGL clients, chunk-streamed world logic, protected player-built civilization systems, deterministic ARE simulation rules, self-healing runtime safeguards, and a long-term design path toward an emergent AI population that can trade, remember, organize, govern, build, revolt, ally, migrate, and reshape the world through explicit rule-bound logic.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Runtime](https://img.shields.io/badge/runtime-deterministic_10Hz-blue)
![Simulation](https://img.shields.io/badge/simulation-ARE_logic-purple)
![License](https://img.shields.io/badge/license-proprietary_all_rights_reserved-red)

> This repository is proprietary. It is not MIT licensed. See [License and Usage Policy](#license-and-usage-policy).

---

## Vision

Areloria is not designed as a simple web game shell. It is an attempt to build a mathematically disciplined, deterministic living-world engine for a browser MMORPG.

The world is meant to feel inhabited rather than scripted. NPCs are not only quest dispensers. They are future citizens, workers, traders, witnesses, political actors, enemies, allies, informants, settlers, rulers, rebels, and memory-bearing participants in a simulated civilization.

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

### 1. Determinism rules the simulation

Gameplay state must be reproducible from explicit inputs.

Simulation code must not depend on process-local randomness or hidden wall-clock state.

Forbidden in simulation paths:

```text
Math.random()
Date.now()
new Date()
randomUUID()
process uptime as gameplay input
host/container identity as gameplay input
```

Use instead:

```text
AREClock
ARERng
explicit tick time
stable seeds from world facts
```

Good seed parts:

```text
worldSeed | regionId | chunkId | tick | actorId | targetId | tableId | cycleId
```

The determinism gate currently protects simulation-critical paths including:

```text
server/src/core/systems/**
server/src/core/watchdogs/**
server/src/core/*Watchdog.ts
server/src/modules/brain/**
server/src/modules/loot/**
server/src/modules/warfront/**
server/src/modules/oracle/**
```

### 2. ARE logic is the governing model

Areloria is built around the project’s ARE logic model: an axiomatic, deterministic rule system intended to govern simulation flow, replayability, causality, pressure, observation, and bounded emergence.

Within this repository, ARE is treated as the governing logic layer for:

- deterministic time,
- deterministic randomness,
- world pressure,
- causal mutation,
- replay-safe state transitions,
- region and chunk rule enforcement,
- oracle/brain interpretation,
- protected simulation boundaries.

The current implementation contains practical ARE primitives such as:

```text
AREClock
SystemAREClock
FixedAREClock
ARERng
SeededARERng
createARESeed
```

These are engineering primitives. The broader ARE theory, formula language, manuscripts, trademarks, research notes, and commercial/political/industrial usage rights are reserved by the rights holder and are not granted by this repository.

### 3. Observation bounds reality

The world should not simulate every possible place at full cost forever.

Areloria follows an observation-driven principle:

```text
Only observed or relevant regions receive expensive simulation.
Unobserved regions decay, summarize, or sleep.
```

This keeps server load proportional to active player observation and relevant world pressure.

### 4. The 10Hz server tick is sacred

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

### 5. Player-built and paid structures are protected

Areloria’s civilization and monetization design includes player-built assets and potentially paid construction energy.

Default rule:

```text
If uncertain, do not damage the structure.
```

NPCs, swarms, bosses, decay systems, watchdogs, and world events must not damage or destroy player-built, paid, or protected structures unless an explicit reviewed policy allows it.

Protection concepts include:

```text
isPlayerBuilt
paidAsset
protectedFeature
damageableByWorldEvent === true
ownerId
assetProtectionTier
```

---

## Game features and world systems

Areloria’s design combines classic MMORPG pleasures with deterministic simulation depth.

### Player progression

- Classless progression inspired by open-skill MMORPG design.
- Stamina and skill use shape combat capability.
- No hard conceptual level ceiling in the long-term design.
- Equipment, loot, region pressure, and mastery shape identity.

### Loot and item systems

- Diablo-like rarity and affix direction.
- Deterministic loot rolls through `ARERng`.
- Smart loot and treasure tables must be replay-safe.
- Item generation cannot use host randomness in simulation.

### Combat

- Server-authoritative combat.
- Deterministic critical hits and damage calculations.
- Replay-safe loot drop rolls.
- Region threat and oracle pressure may affect outcomes through explicit state.

### Warfronts

- Deterministic cycle timing through `AREClock`.
- Daily/seasonal warfront cycle logic.
- Front boss readiness, phase changes, and reward history must be reproducible.
- Warfront combat telemetry is treated as side-channel observability, not gameplay truth.

### Oracle and prophecy

- Oracle systems expose pattern pressure, warnings, visions, and world-thought.
- Oracle outputs must be deterministic when they affect simulation or player-facing state.
- Prophecy archive timing is explicit and replay-friendly.

### Brain and watchdog systems

Brain systems perform low-frequency heuristic reasoning.

Watchdog systems perform bounded fast-path checks.

Current and planned examples include:

- Matrix precognition and load projection,
- chrono swarm density detection,
- reality fissure/paradox tracking,
- synaptic load dilation,
- world-brain cache summaries,
- future Aetheric Leyline logic,
- future Chronos Anomaly zones,
- future Void Swarm incursions.

All Brain/Watchdog simulation code is now expected to pass the ARE determinism gate.

### Emergent AI population

The future population model aims for NPCs that can:

- remember local player actions,
- share local memory through bounded caches,
- refuse help to hostile players,
- trade and price goods according to scarcity,
- found or join settlements,
- participate in elections,
- follow laws or rebel against them,
- declare war or seek peace,
- migrate under pressure,
- form guilds, villages, towns, cities, kingdoms, and lands,
- generate visible thought/intent channels where appropriate.

This population must remain deterministic, bounded, inspectable, and compatible with server tick constraints.

### Civilization and settlement rules

World-building must respect deterministic layout rules, including concepts such as:

- 64x64 chunk logic,
- city/village hierarchy,
- roads between structures,
- walls connected with valid doors,
- houses not overlapping houses,
- spacing rules between buildings,
- dungeon/world-boss distance constraints,
- biome or region boundaries for larger political units.

These rules belong in explicit validators, not hidden client-only assumptions.

### GLB and asset safety

Areloria targets GLB-based 3D assets for characters, structures, items, and world objects.

Asset rules:

- validate GLB assets before runtime use,
- quarantine broken or unsafe assets,
- do not crash the runtime on malformed content,
- keep placement deterministic,
- enforce city layout and protected-asset policies.

---

## Engine architecture

### Monorepo layout

```text
apps/                 Application surfaces and API shells
client/               Browser 3D client
server/               Authoritative game server
packages/             Shared packages and core logic
projects/             Additional project modules and experiments
docs/                 Architecture, deploy, policy, and audit docs
scripts/              Build, deploy, audit, and validation scripts
.github/workflows/    CI, deploy, and guardrail automation
```

### Runtime shape

```text
Browser Client
  -> Host Nginx
  -> 127.0.0.1:3001
  -> arelorian-engine Docker container
  -> Node.js authoritative server
  -> Supabase/PostgreSQL, Redis, Soketi/Pusher-compatible services
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
pnpm 9.x or newer
Docker for production-style deploy testing
```

### Common commands

```bash
pnpm install
pnpm build:all
pnpm dev:all
```

Targeted builds:

```bash
pnpm build:network
pnpm build:2d
pnpm build:3d
```

Determinism gate:

```bash
node scripts/check-are-determinism.mjs
```

Recommended server/client checks:

```bash
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/client --if-present build
```

Repository consistency gate (lint, interact-distance check, Playwright smoke, content validation, light audits):

```bash
pnpm run dgcc
pnpm run dgcc:extreme
pnpm run ci:verify
```

---

## Deployment

### VPS Docker deploy

Primary deploy workflow:

```text
GitHub Actions -> VPS Docker Deploy (monorepo)
```

Default production values:

```text
ARELORIAN_PORT=3001
ARELORIAN_DOCKER_NETWORK=areloria_arelorian-network
ARELORIAN_ENV_FILE=.env.docker
```

Runtime secrets are written to a VPS-local `.env.docker` file and loaded by Docker Compose. Do not commit runtime secrets.

After a successful deploy, the verification workflow can validate:

```text
/health
/client-config.json
/
container state
host port mapping
optional nginx config
recent engine logs
```

Workflow:

```text
VPS Final Deploy Verification
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
- every new simulation path must be covered by the determinism gate,
- every heavy runtime feature must be feature-flagged and cadence-bounded.

---

## Documentation map

Important docs include:

```text
docs/AGENT_FEATURE_PR_POLICY.md
docs/ARE_DETERMINISM_CLASSIFICATION.md
docs/ARE_TELEMETRY_SIDE_CHANNEL.md
docs/AUDIT_RUNTIME_STABILITY_2026-05-16.md
docs/DEPLOY_PORT_MAP.md
docs/NGINX_HOST_GATEWAY.md
```

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

The current priority is to keep the engine deterministic, deployable, and safe while expanding toward a living browser MMORPG with an emergent AI population and protected player civilization systems.

The world must be allowed to become strange, but never nondeterministic by accident.
