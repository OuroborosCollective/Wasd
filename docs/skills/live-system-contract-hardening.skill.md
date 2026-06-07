# Skill: Live System Contract Hardening

## Purpose

Protect the real live client entrypoint contract so agents do not integrate features into fake or dead 2D paths.

## Inputs

- Repository root
- Client source paths
- Runtime distribution path
- Public route paths

## Outputs

- Guard result from `pnpm guard:entrypoints`
- Health result from `/health/client-entrypoints`
- E2E route contract result

## Deterministic Rules

- No random gameplay decisions
- No wall-clock gameplay progression
- No client-authoritative outcomes
- No fake root `2d/` source path
- Stable route truth: source is `apps/client-2d`, route is `/2d`

## Failure Cases

- Missing `apps/client-2d/src/main.tsx`
- Missing `apps/client-2d/index.html`
- Fake root `2d/index.html`
- Health endpoint missing entrypoint metadata

## Test Commands

```bash
pnpm guard:entrypoints
pnpm guard:all
pnpm run test:e2e -- --grep "Live System Contract"
```
