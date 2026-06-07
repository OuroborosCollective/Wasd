# Client Entrypoint Architecture

## Purpose

This document defines the current source-of-truth contract for WASD / ARELORIA client entrypoints.

## Contract

- `apps/client-2d` is the real 2D client source.
- `/2d` is the public runtime route.
- A root-level `2d/` directory must not become a fake client source.
- The server exposes the runtime route mapping through `/health/client-entrypoints`.

## Why this exists

The project has had multiple historical 2D paths and HUD/client experiments. This guard prevents new work from being integrated into a dead or fake client path.

## Guard

Run:

```bash
pnpm guard:entrypoints
```

The guard checks required source paths and rejects fake root-level 2D source assumptions.

## Health endpoint

Run:

```bash
curl /health/client-entrypoints
```

The endpoint reports source paths, runtime paths, public routes and availability booleans.

## Deterministic rule

This contract is structural only. It must not introduce gameplay state, time-based logic, random choices or client-authoritative decisions.
