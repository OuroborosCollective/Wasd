# Agent Feature PR Policy

This document is mandatory reading for Jules, Replit, Cursor, Codex-like agents, no-code agents, and any automated contributor that modifies WASD/Areloria.

The repository is not a sandbox for broad rewrites. Every change must preserve the ARE deterministic simulation model, the protected-asset economy, and the deploy/runtime stability guarantees already present in `main`.

## Prime rule

Small, reviewable, deterministic PRs only.

A feature PR must do one thing well. Do not mix gameplay features, lockfile rewrites, React/TypeScript dependency changes, Docker changes, workflow changes, deploy changes, and formatting changes in the same PR.

## Mandatory PR shape

Every feature PR must include:

1. A clear title with a narrow scope.
2. A body explaining:
   - what changed,
   - why it is safe,
   - which runtime paths are touched,
   - whether it changes simulation behavior,
   - whether it touches protected structures or paid assets,
   - which tests/checks were run.
3. No unrelated `pnpm-lock.yaml` changes.
4. No unrelated package dependency changes.
5. No deploy or Docker changes unless the PR is explicitly a deploy PR.
6. No broad formatting-only rewrites.

## ARE determinism rules

Simulation code must be replayable from explicit inputs.

Forbidden in simulation paths:

- `Math.random()`
- `Date.now()`
- `new Date()`
- `randomUUID()`
- process uptime as gameplay input
- hostname/container id as gameplay input

Use instead:

- `ARERng` for random decisions,
- `AREClock` or explicit tick/world time for time decisions,
- stable seeds derived from world facts.

Good seed parts:

```text
worldSeed | regionId | chunkId | tick | actorId | targetId | tableId | cycleId
```

Bad seed parts:

```text
Date.now() | Math.random() | process uptime | host name | container id
```

## Determinism gate coverage

The ARE determinism gate protects simulation paths, including:

```text
server/src/core/systems/**
server/src/core/watchdogs/**
server/src/core/*Watchdog.ts
server/src/modules/brain/**
server/src/modules/loot/**
server/src/modules/warfront/**
server/src/modules/oracle/**
```

If a feature adds simulation elsewhere, the PR must extend the gate.

Telemetry belongs in side-channel paths such as:

```text
server/src/core/telemetry/**
server/src/core/liveheal/**
server/src/core/logger/**
server/src/core/api/**
server/src/core/integrity/**
```

Do not hide gameplay nondeterminism with allow comments. Allow markers are rare exceptions, not a normal development method.

## Protected structures and paid assets

No NPC, swarm, world event, watchdog, decay system, boss system, or automated simulation may damage or destroy protected player assets by default.

Before any structure damage is applied, the code must explicitly check protection policy. Required concepts include one or more of:

```text
isPlayerBuilt
paidAsset
protectedFeature
damageableByWorldEvent === true
ownerId
assetProtectionTier
```

Default behavior must be protective:

```text
if uncertain, do not damage the structure.
```

Paid/player-built structures may only be modified by systems that are explicitly designed and reviewed for that purpose.

## Feature flag requirement

New gameplay systems must be behind a feature flag or registry entry until fully integrated.

Examples:

```text
features.aethericLeylines
features.chronosAnomalies
features.voidSwarmIncursions
features.emergentNpcSociety
```

A PR that adds a new system must clearly state whether the system is:

- inactive skeleton,
- feature-flagged runtime path,
- production-active runtime path.

## Brain / Watchdog / Plexity pattern

When adding new logical features, use this separation:

### Brain

Low-frequency server heuristic analysis.

Rules:

- deterministic inputs,
- no direct entity mutation,
- no random host state,
- output decisions/directives only.

### Watchdog

Fast-path 10Hz execution or safety enforcement.

Rules:

- deterministic,
- bounded CPU work,
- no broad scans without chunk/region limits,
- no protected-asset damage unless policy allows.

### Plexity

Client/device scaling and visual adaptation.

Rules:

- stateless where possible,
- may affect rendering quality,
- must not change authoritative simulation truth.

## WorldTick integration rules

Do not inject heavy logic directly into the 10Hz tick.

Every WorldTick integration must declare:

- tick cadence,
- max entities/chunks processed per tick,
- deterministic seed/time source,
- failure behavior,
- feature flag,
- telemetry side-channel, if any.

The server tick must remain bounded and deterministic.

## GLB and asset rules

New GLB/world asset logic must respect:

- asset validation,
- quarantine for defective assets,
- no runtime crash on bad GLB,
- deterministic placement rules,
- city layout constraints,
- road/wall/door consistency,
- protected player structures.

Do not bypass LiveHeal or asset quarantine services.

## Monorepo and dependency rules

Do not modify lockfiles unless the PR explicitly changes dependencies.

Do not add dependencies to solve a local type error if a local type shim or package-local fix is sufficient.

Do not change workspace linking casually. If dependencies are touched, explain:

- which package needs the dependency,
- whether it is runtime or dev-only,
- why an existing package cannot provide it,
- why the lockfile diff is minimal.

## Deploy and workflow rules

Feature PRs must not modify:

- Dockerfiles,
- docker-compose files,
- VPS workflows,
- deployment scripts,
- Nginx files,
- secrets handling,
- env-file behavior.

Unless the PR is specifically a deploy PR.

Deploy PRs must not include gameplay changes.

## Required checks before requesting review

At minimum, run or reason against:

```bash
node scripts/check-are-determinism.mjs
pnpm --filter @wasd/server --if-present build
pnpm --filter @wasd/shared --if-present build
pnpm --filter @wasd/client --if-present build
```

If only a subset is relevant, state why.

## Review blockers

A PR must be rejected if it:

- is a draft but asks to be merged,
- touches unrelated lockfile areas,
- introduces `Math.random()` or wall-clock time in simulation,
- bypasses ARE determinism gate paths,
- damages structures without protection policy,
- mixes feature work with deploy/CI rewrites,
- changes licensing or ownership language casually,
- rewrites README/docs to remove proprietary warnings,
- activates a heavy runtime system without feature flag or cadence limit.

## Preferred PR sequence for new large features

For major systems, split into stages:

1. Docs and design contract.
2. Deterministic data types and interfaces.
3. Inactive skeleton behind feature flag.
4. Unit/smoke tests.
5. WorldTick integration with cadence limits.
6. Client/Plexity visuals.
7. Telemetry side-channel.
8. Production activation.

No dragon enters the city without a gate, a name, and a leash.
