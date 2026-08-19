# Areloria WASD Genkit Development Control Plane

## Purpose

This repository exposes an isolated Genkit development/content side-channel for AI-assisted game work. It is deliberately separate from the authoritative gameplay runtime.

Genkit may propose NPC content, quest/lore content, UI/menu implementation plans, database change plans, code-fix plans, playtest analyses, and asset generation/import plans. A proposal is never evidence that the proposed write or runtime action happened.

## Truth boundary

The authoritative gameplay chain remains:

`external wish -> server validation/canonicalization -> tick-bound input -> deterministic mutation/projection -> snapshot/hash/evidence`

Genkit is outside that chain:

`Genkit/model -> schema-validated proposal -> SHA-256 proposal receipt -> human/tool review -> real implementation tool -> tests/readback -> (for gameplay wishes) existing server canonical-intent path`

Hard rules:

- Genkit does not set `tickId`, `actorId`, `chunkKey`, `logicalIndex`, `receivedOrder`, `kappa`, `CanonicalIntent`, `intentHash`, `snapshotHash`, `manifestHash`, or `worldHash`.
- Genkit does not directly mutate the running game server.
- Genkit does not directly execute database or repository writes.
- Database and code-fix flows produce plans marked `OWNER_REQUIRED`.
- No model output is called a test pass, runtime readback, migration success, deployment success, or gameplay truth without the corresponding real evidence.
- The Genkit runtime is not imported by `server/src/index.ts`.

## Available flows

| Flow | Purpose | Effect class | Approval |
| --- | --- | --- | --- |
| `areloriaNpcProposalFlow` | NPC spawn/content/dialogue/behavior proposal | `CONTENT_PROPOSAL` | `REVIEW_REQUIRED` |
| `areloriaQuestLoreFlow` | Quest and lore authored-content proposal | `CONTENT_PROPOSAL` | `REVIEW_REQUIRED` |
| `areloriaUiMenuPlanFlow` | UI/menu component and verification plan | `UI_CODE_PLAN` | `REVIEW_REQUIRED` |
| `areloriaDatabasePlanFlow` | Forward/rollback/verification SQL plan | `DATABASE_WRITE_PLAN` | `OWNER_REQUIRED` |
| `areloriaCodeFixPlanFlow` | Evidence-driven code-fix/test/readback plan | `REPOSITORY_WRITE_PLAN` | `OWNER_REQUIRED` |
| `areloriaPlaytestAnalysisFlow` | Structured playtest evidence analysis | `OBSERVABILITY_ANALYSIS` | `REVIEW_REQUIRED` |
| `areloriaAssetPlanFlow` | Asset prompt, provenance and import-validation plan | `ASSET_PLAN` | `REVIEW_REQUIRED` |

Every successful flow returns `truthClass=SIDE_CHANNEL_PROPOSAL`, `authoritativeMutationAllowed=false`, `requiresReadback=true`, and a canonical SHA-256 receipt for the exact proposal envelope.

## Provider configuration

The current repository already contains the legacy `@genkit-ai/googleai` provider package. The bridge accepts a key from the first configured variable below without printing its value:

1. `GOOGLE_GENAI_API_KEY`
2. `GOOGLE_GENERATIVE_AI_API_KEY` (already present in `.env.example`)
3. `GOOGLE_API_KEY`

Optional:

```bash
export GENKIT_MODEL=gemini-2.5-flash
export GENKIT_CLI_VERSION=1.40.1
```

No key is committed to the repository.

## Commands

Readiness without exposing credentials:

```bash
bash genkit.sh doctor
```

Require a real provider credential:

```bash
bash genkit.sh doctor --require-provider
```

Run the contract suite:

```bash
bash genkit.sh test
```

Start the Genkit Developer UI with the isolated Areloria runtime:

```bash
bash genkit.sh dev
```

Start only the isolated runtime:

```bash
bash genkit.sh runtime
```

Start the Genkit MCP server over stdio:

```bash
bash genkit.sh mcp
```

The launcher uses a local/global `genkit` binary when available. Otherwise it falls back to `pnpm dlx genkit-cli@1.40.1`, matching the repository's Genkit core version at integration time.

## MCP clients

The checked-in `.mcp.json` starts the project-scoped server through `bash ./genkit.sh mcp`. MCP clients that do not consume `.mcp.json` can use the same command manually.

Useful Genkit MCP operations include documentation lookup, runtime management, flow discovery, flow execution, and trace retrieval. For this repository, start the isolated runtime rather than the production game server when you only need Genkit flows.

A typical MCP session is:

1. Start/connect `genkit` MCP.
2. Start the runtime with `pnpm exec tsx src/genkit/runtime.ts` from the `server/` working directory.
3. Call `list_flows` and inspect schemas.
4. Call `run_flow` with schema-valid JSON.
5. Inspect the returned proposal and receipt.
6. If implementation is desired, hand the plan to the appropriate repository/database/UI tool under its own permission boundary.
7. Run real tests and runtime/persistence readback after mutation.

## Example MCP flow input

NPC proposal:

```json
{
  "mode": "full",
  "brief": "Design a blacksmith NPC for the northern settlement who can introduce the repair loop.",
  "constraints": [
    "Do not invent authoritative spawn state",
    "Keep authored content suitable for game-data"
  ]
}
```

Code-fix plan:

```json
{
  "brief": "Analyze why inventory drag and drop stops responding after reopening the panel.",
  "failingEvidence": "Paste the real stack trace, test output, or runtime evidence here."
}
```

Database plan:

```json
{
  "operation": "create_table",
  "brief": "Plan persistence for reviewed authored quest definitions.",
  "constraints": [
    "Include rollback SQL",
    "Include live schema/readback verification",
    "Do not execute the migration"
  ]
}
```

## Repository implementation notes

- `server/src/genkit/index.ts` registers the flows.
- `server/src/genkit/runtime.ts` keeps only the Genkit reflection/runtime process alive.
- `server/src/genkit/contracts.ts` enforces the non-authoritative payload boundary and canonical receipts.
- `server/src/genkit/catalog.ts` is the machine-readable capability/effect inventory.
- `server/src/genkit/doctor.ts` reports readiness without exposing secrets.
- `server/src/genkit/__tests__/contracts.test.ts` verifies receipt determinism and rejects authority-field injection.

## Provider hardening follow-up

The repository's existing `@genkit-ai/googleai` package is deprecated upstream in favor of `@genkit-ai/google-genai`. That dependency migration must update and verify the pnpm lockfile as its own reproducible change; it is intentionally not mixed into this control-plane slice without a package-manager readback.
