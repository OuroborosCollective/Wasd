# Aurion NPC memory source contract

AIM-292 moves the touched NPC and merchant rules into `server/src/aurion/npc` in WASD. Aurion consumes an immutable compiled capsule and owns authentication, database transactions and confirmed readmodels. AX1 displays those readmodels. This source change alone does not establish an Aurion deployment or a MariaDB persistence result.

## Build and consume

Use the frozen pnpm 11.8.0 server workspace. The builder requires committed source and pins esbuild 0.28.2, TypeScript 5.9.3 and Zod 4.5.4. It bundles the actual Zod-v3 validation runtime and its license, then emits strict declarations. The manifest binds the WASD commit, every source module, compiler configuration, lockfile and every output file. The compiled module contains immutable source revision and source hash literals; runtime environment variables cannot substitute an authority.

```sh
pnpm install --frozen-lockfile --filter @wasd/server...
node scripts/build-aurion-npc-capsule.mjs /tmp/aurion-npc-capsule
node scripts/verify-aurion-npc-capsule.mjs /tmp/aurion-npc-capsule EXPECTED_WASD_SHA EXPECTED_MANIFEST_SHA256
WASD_NPC_CAPSULE_DIR=/tmp/aurion-npc-capsule node --test scripts/__tests__/aurion-npc-capsule.test.mjs
```

The expected identities must come from a reviewed consumer pin. Reading a hash from an untrusted manifest is not an independent trust anchor. Verification checks the exact file set, regular files, source and output hashes, source state and compiler versions **before** executing any artifact code. The `--local-candidate` build option labels uncommitted work explicitly; production verification rejects that state. The CI workflow builds twice from the exact PR head or main commit, compares every byte and uploads both outputs plus a verification receipt. Aurion must rebuild from the merged source revision and compare against its checked-in capsule and pin.

## Four memory classes

| Class | Stored evidence | Bound |
|---|---|---|
| Working | Current selected goal, validated bounded plan and the actual confirmed decision receipt ID | One current decision; reservations remain empty until the typed action gateway establishes reservation receipts |
| Episodic | Goal-selection episodes, logical index, region, self participant, outcome and complete source provenance | 24 episodes; expire after 3,500 logical indices |
| Semantic | Typed `selected_goal` and `current_hub` facts from confirmed v3 receipt fields, version, validity and complete provenance | 64 facts; expired and contradictory retained facts remain explicitly classified |
| Procedural | Revision-bound configured utility-selection and bounded-planning competencies | Two active configured competencies, schema ceiling eight; no claim of learned or executed skill |

The entire state is capped at 262,144 UTF-8 bytes, with at most 64 recent receipt identities and 4,096 receipts per replay call. Capacity pruning removes whole entries; it never silently discards provenance from a retained fact. Fact conflicts use stable IDs and overlapping validity windows. Sorting, tie handling, expiry and hashes use logical indices and canonical serialization, without wall clocks or randomness.

`verifyConfirmedNpcDecision` validates the actual persisted v3 receipt bytes, decision/state hashes, expected columns and deterministic receipt ID. Only its verified object can enter `commitNpcMemoryV4`; the host must call this after its transaction reads the inserted receipt back. This in-process check does not replace database transaction or source-authority verification. Duplicate delivery preserves the exact state and hash. Conflicting delivery is rejected. An unseen stale receipt cannot rewind or refresh memory. Rehydration validates canonical order, entry IDs, cursor, plan hash and provenance consistency. It also requires the external database receipt-chain check: a self-consistent hash by itself is not proof of persisted history.

Only typed confirmed receipt fields become facts. Legacy observation strings, free text, proposed plans and LLM text cannot create executed-action evidence. The public v4 projection exposes bounded counts, goal/plan status, conflicts, expiry and source/hash identity; it does not expose raw memories or provenance payloads. Existing AURS-v2 `memoryCount` retains its original meaning.

## Compatibility and cutover

Legacy NPC need, life, memory and v2/v3 receipt identities are preserved. Golden fixtures were generated from the original Aurion main `3e51b5f21d55b2b7f549d24fc15526980f41a109`, including 80 sequential merchant decisions across four hubs. They prove byte/hash compatibility of the migrated calculations. They are isolated protocol fixtures with persistence IO replaced, not production receipts. Fixture metadata records the original source-file hashes.

Aurion integration must remove the corresponding editable rule bodies, use thin imports of this capsule, and remove the touched free-form NPC resolution admin mutation. A separate additive v4 receipt table must bind the inserted decision receipt, prior memory hash, WASD source identity and memory hash inside the existing per-NPC transaction. Historical v2/v3 receipts remain readable. The first new WASD-bound receipt can start at an already-high production index; existing historical receipts must not be retrospectively labelled WASD-generated v4 evidence.

Completion of AIM-292 still requires the separate Aurion consumer PR, additive migration through the canonical proof/apply/readback chain, real MariaDB replay/restart evidence and authenticated AX1 rendering. AIM-293 adds the bounded typed action gateway and editorial consent; AIM-294 adds an evidence-derived graph. Neither capability is claimed by this memory-source change.
