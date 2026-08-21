# Areloria WASD Genkit Development Control Plane

## Purpose

This repository exposes an isolated Genkit development/content side-channel for AI-assisted game work. It is deliberately separate from the authoritative gameplay runtime.

Genkit may propose NPC content, quest/lore content, canonical quest definitions, UI/menu implementation plans, database change plans, code-fix plans, playtest analyses, and asset generation/import plans. A proposal is never evidence that the proposed write or runtime action happened.

## Truth boundary

The authoritative gameplay chain remains:

`external wish -> server validation/canonicalization -> tick-bound input -> deterministic mutation/projection -> snapshot/hash/evidence`

Genkit is outside that chain:

`Genkit/model -> real content context -> schema-validated proposal -> SHA-256 proposal receipt -> explicit review/promotion -> real validation/readback -> game-data -> runtime content loader`

Hard rules:

- Genkit does not set `tickId`, `actorId`, `chunkKey`, `logicalIndex`, `receivedOrder`, `kappa`, `CanonicalIntent`, `intentHash`, `snapshotHash`, `manifestHash`, or `worldHash`.
- Genkit does not directly mutate the running game server.
- Genkit does not directly execute database or repository writes.
- Database and code-fix flows produce plans marked `OWNER_REQUIRED`.
- No model output is called a test pass, runtime readback, migration success, deployment success, or gameplay truth without the corresponding real evidence.
- The Genkit runtime is not imported by `server/src/index.ts`.
- The implementation lives under `server/src/devtools/genkit/` so it cannot shadow the npm package named `genkit` during TypeScript module resolution.

## Available flows

| Flow | Purpose | Effect class | Approval |
| --- | --- | --- | --- |
| `areloriaNpcProposalFlow` | NPC spawn/content/dialogue/behavior proposal | `CONTENT_PROPOSAL` | `REVIEW_REQUIRED` |
| `areloriaQuestLoreFlow` | Free-form quest and lore authored-content proposal | `CONTENT_PROPOSAL` | `REVIEW_REQUIRED` |
| `areloriaCanonicalQuestProposalFlow` | One canonical quest grounded in the real selected `game-data` context | `CONTENT_PROPOSAL` | `REVIEW_REQUIRED` |
| `areloriaUiMenuPlanFlow` | UI/menu component and verification plan | `UI_CODE_PLAN` | `REVIEW_REQUIRED` |
| `areloriaDatabasePlanFlow` | Forward/rollback/verification SQL plan | `DATABASE_WRITE_PLAN` | `OWNER_REQUIRED` |
| `areloriaCodeFixPlanFlow` | Evidence-driven code-fix/test/readback plan | `REPOSITORY_WRITE_PLAN` | `OWNER_REQUIRED` |
| `areloriaPlaytestAnalysisFlow` | Structured playtest evidence analysis | `OBSERVABILITY_ANALYSIS` | `REVIEW_REQUIRED` |
| `areloriaAssetPlanFlow` | Asset prompt, provenance and import-validation plan | `ASSET_PLAN` | `REVIEW_REQUIRED` |

Every successful flow returns `truthClass=SIDE_CHANNEL_PROPOSAL`, `authoritativeMutationAllowed=false`, `requiresReadback=true`, and a canonical SHA-256 receipt for the exact proposal envelope.

## Canonical quest authoring

`areloriaCanonicalQuestProposalFlow` is stricter than the general quest/lore flow:

1. Resolve the same content root selected by the server (`legacy`, reviewed pack, or published pack).
2. Run authoring-grade validation before the model is called.
3. Read real NPC, item, quest and lore identifiers.
4. Sort the context and bind it to `sourceContentHash` using the existing canonical SHA-256 receipt function.
5. Ask the model for exactly one quest matching the canonical authored quest schema.
6. Validate the returned NPC/item/prerequisite references against the real selected content.
7. Return a review-only proposal whose promotion target is `quests/quests.json` and whose `writePerformed` field is always `false`.

A stale proposal is rejected at promotion time if its `sourceContentHash` no longer matches current content.

The canonical authored quest contract is implemented in:

- `server/src/modules/content/questContentContract.ts`
- `server/src/modules/content/validateAuthoringContent.ts`
- `server/src/devtools/genkit/worldContext.ts`
- `server/src/devtools/genkit/canonicalQuestFlow.ts`

## Explicit quest promotion

Genkit itself never writes `game-data`. A reviewed proposal can be promoted only through the separate CLI tool with the exact approved receipt:

```bash
cd server
pnpm exec tsx src/tools/promoteCanonicalQuestProposal.ts \
  --proposal ../content-proposals/quest.json \
  --approve-receipt <exact-sha256-from-proposal>
```

The promotion tool:

- accepts only `CANONICAL_QUEST_PROPOSAL`,
- recomputes and verifies the SHA-256 receipt,
- requires the proposal's content hash to match current content,
- refuses direct promotion into published/pack runtime roots,
- validates all canonical quest fields and references,
- writes the legacy authoring `quests/quests.json`,
- runs authoring validation after the write,
- reads the content back and verifies the new quest is present,
- restores the original file if post-write validation/readback fails.

The tool's successful JSON output is write/readback evidence for the authored content file only. It is not proof that a running game server loaded the quest; runtime content-loader readback remains a separate gate.

## Provider configuration

The current repository already contains the legacy `@genkit-ai/googleai` provider package. The bridge accepts a key from the first configured variable below without printing its value:

1. `GOOGLE_GENAI_API_KEY`
2. `GOOGLE_GENERATIVE_AI_API_KEY`
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
2. Start the runtime with `pnpm exec tsx src/devtools/genkit/runtime.ts` from the `server/` working directory.
3. Call `list_flows` and inspect schemas.
4. Call `run_flow` with schema-valid JSON.
5. Inspect the returned proposal, `sourceContentHash`, validation fields and receipt.
6. Review the proposal outside the runtime truth path.
7. If promotion is approved, save the exact envelope to a review file and invoke the explicit promotion tool with its exact receipt.
8. Run real tests and runtime/content-loader readback after mutation.

## Example MCP flow input

Canonical quest proposal:

```json
{
  "brief": "Add one early-game quest that deepens the existing Millbrook resource loop without inventing new NPC or item IDs.",
  "constraints": [
    "Use only real NPC and item IDs from the supplied content context",
    "Keep the reward appropriate for early progression"
  ]
}
```

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

## External product/research side channels

Amplitude and Quicknode are not Genkit providers and never enter the Genkit/runtime authority path. Their optional server observers live under `server/src/services/` and are disabled by default.

Safe status can be inspected without printing credentials:

```bash
cd server
pnpm exec tsx src/tools/externalSideChannelDoctor.ts
```

To run a real read-only Quicknode probe when a real HTTPS RPC URL is configured:

```bash
pnpm exec tsx src/tools/externalSideChannelDoctor.ts --probe-quicknode
```

Amplitude observes immutable projections of already-recorded canonical intents. Quicknode exposes only `eth_chainId` and `eth_blockNumber`. Neither service can change intent acceptance, TickSystem execution, world state, or hashes.

## Repository implementation notes

- `server/src/devtools/genkit/index.ts` registers the original proposal flows.
- `server/src/devtools/genkit/canonicalQuestFlow.ts` registers the real-context canonical quest flow.
- `server/src/devtools/genkit/runtime.ts` keeps only the Genkit reflection/runtime process alive.
- `server/src/devtools/genkit/contracts.ts` enforces the non-authoritative payload boundary and canonical receipts.
- `server/src/devtools/genkit/catalog.ts` is the machine-readable capability/effect inventory.
- `server/src/devtools/genkit/worldContext.ts` builds a deterministic prompt context from real selected content.
- `server/src/devtools/genkit/doctor.ts` reports Genkit readiness without exposing secrets.
- `server/src/devtools/genkit/__tests__/contracts.test.ts` verifies receipt determinism and rejects authority-field injection.
- `server/src/devtools/genkit/__tests__/questAuthoring.test.ts` verifies real-content grounding and reference rejection.
- `server/src/devtools/genkit/__tests__/sideChannels.test.ts` verifies observer failures cannot change canonical intent truth.

## CI verification

The existing Genkit workflow builds `@wasd/shared` before the server TypeScript check because the server consumes shared package declarations. It then runs the Genkit contract test, the provider-safe doctor, the repository architecture guard, and the deterministic WorldTick guard. The branch also contains additional quest-authoring/side-channel tests; CI configuration must explicitly include them before their result may be used as release evidence.

## Provider hardening follow-up

The repository's existing `@genkit-ai/googleai` package is deprecated upstream in favor of `@genkit-ai/google-genai`. That dependency migration must update and verify the pnpm lockfile as its own reproducible change; it is intentionally not mixed into this control-plane slice without a package-manager readback.
