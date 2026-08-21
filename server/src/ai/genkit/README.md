# Areloria Genkit Authoring

This directory is an **authoring side-channel**, never gameplay authority.

Allowed flow:

`Designer / ChatGPT -> Genkit proposal -> schema validation -> canonical compiler -> SHA-256 -> explicit Studio/Git write -> server content load -> deterministic ARE runtime`

Forbidden flow:

`Genkit / model output -> direct player/NPC/world mutation`

## Operator surfaces

- CLI: `pnpm --filter @wasd/server authoring:genkit -- --kind=status`
- Admin MCP tools:
  - `genkit_authoring_status`
  - `genkit_propose_quest`
  - `genkit_propose_world_poi`

Proposal tools never write `game-data`. They return the validated proposal, canonical JSON, target path and SHA-256. Acceptance remains a separate hash-bound Studio/Git action.

## Time boundary

Model/provider latency, retries, token accounting and wall-clock measurements are side-channel telemetry only. Proposal IDs and compiled content hashes must not depend on wall clock, random UUIDs or model timestamps.

## Provider state

The repository currently contains the legacy `@genkit-ai/googleai` package. The authoring runtime exposes this fact as `migrationRequired: true`; migrate to the current unified Google GenAI plugin in a lockfile-safe dependency change. Missing credentials produce `available:false` and never fallback content.