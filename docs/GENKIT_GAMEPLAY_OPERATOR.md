# Genkit Gameplay Operator

## Purpose

The Genkit gameplay operator lets an owner-authorized MCP/Genkit control plane act as a real Areloria player **without becoming a second gameplay authority**.

The authority chain stays:

`operator request -> existing server validation / WorldTick -> ServerCanonicalIntent -> domain mutation/persistence -> authoritative follow-up readback`

Genkit may choose or request an action. It never supplies tick authority, world hashes, mutation success, persistence success, actor authority, or a client-authored result.

## Transport

Preferred remote MCP endpoint:

- `POST/GET/DELETE /api/mcp` — stateless Streamable HTTP, one fresh transport per request.
- `/api/mcp/sse` + `/api/mcp/messages` — legacy HTTP+SSE compatibility only.

All MCP mutation/tool surfaces are protected by `MCP_ADMIN_TOKEN` Bearer authentication.

The gameplay operator itself calls the live Areloria server only through fixed `127.0.0.1:${PORT}` loopback targets. Arbitrary URLs are not accepted.

## Operator identity

Authoritative HTTP gameplay routes accept an operator identity only when all of the following are true:

1. the request originates from loopback (`127.0.0.1`, `::1`, or `::ffff:127.0.0.1`),
2. `x-areloria-operator-token` matches `MCP_ADMIN_TOKEN` using constant-time digest comparison,
3. `x-areloria-operator-player-id` is a valid server player identifier.

Normal authenticated user/session identity takes precedence over operator delegation.

The token value is never returned by the capability or doctor surfaces.

## Genkit/MCP tools

### `genkit_gameplay_capabilities`

Read the exact executable allowlist plus runtime-port blockers. This is the source for what the operator is currently permitted to claim it can execute.

### `genkit_gameplay_snapshot`

Reads `/api/gameplay/snapshot` through the trusted loopback identity and returns authoritative evidence:

- player ID,
- server tick,
- revision sequence,
- last mutation hash,
- revision SHA-256,
- per-module source-evidence SHA-256 values.

### `genkit_gameplay_execute`

Executes one fixed action. Inputs include:

- `sessionId` — stable operator session identifier,
- `sequence` — positive integer that must strictly increase per session/player,
- `playerId`,
- fixed action identifier,
- action payload,
- optional `expectedRevisionHash` optimistic lock.

A failed/rejected pre-mutation call may release its sequence reservation. Once a server route has accepted a mutation, the sequence stays consumed even when later receipt/readback verification fails, preventing replay after an ambiguous accepted write.

## Currently executable authority paths

- `move` — directly enqueued into the live `RuntimePlayerSystem`; applied by the 10-Hz WorldTick; stamped as `ServerCanonicalIntent`; recorded by `CanonicalIntentIntake`; final position is read back after a later tick.
- `gather` — `/api/resource/gather`.
- `quest_talk` — `/api/npc/talk`.
- `quest_accept` — `/api/quests/accept`.
- `quest_complete` — `/api/quests/complete`.
- `craft` — `/api/crafting/craft`.
- `equipment_equip` — `/api/equipment/equip`; canonical inventory intent plus atomic inventory/equipment persistence.
- `equipment_unequip` — `/api/equipment/unequip`; server resolves the equipped item before canonicalizing the mutation.
- `economy_sell_resource` — `/api/economy/sell-resource`.
- `economy_sell_all_resources` — `/api/economy/sell-all-resources`.
- `economy_buy_resource` — `/api/economy/buy-resource`.
- `economy_complete_camp_quest` — `/api/economy/complete-camp-quest`.
- `economy_trade_transfer` — `/api/economy/trade-transfer`.

Every route-backed executable action must return an `ok: true` response plus a 64-hex `canonicalIntent.intentHash`. A follow-up gameplay snapshot is then read. `effectVerified` is true only when authoritative module evidence or mutation-history evidence changed.

## Explicitly blocked truth gaps

These capabilities must remain unavailable until their runtime truth path exists:

- **Combat:** `CombatTickSystem` exists but is not registered on the live `WorldTickAdapter`; direct `CombatSystem.attack()` would mutate health outside the canonical tick boundary.
- **Free/direct inventory mutation:** the public inventory endpoint is read-only. Inventory still changes through canonical gather/craft/equipment/economy transactions.
- **Guild governance:** `GuildRuntimePort` is currently unavailable on `WorldTickAdapter`.

Do not remove a blocker because a module, test, old WorldTick note, or UI button exists. Remove it only after the live path is registered, invoked, and read back.

## Genkit provider readiness

The gameplay executor itself does not require model output. Model-backed authoring/decision flows require a real Google GenAI credential supported by the current Genkit provider configuration.

Run readiness checks with:

```bash
bash genkit.sh doctor
bash genkit.sh doctor --require-operator
bash genkit.sh doctor --require-provider
bash genkit.sh doctor --require-provider --require-operator
```

`--require-operator` requires `MCP_ADMIN_TOKEN`. `--require-provider` requires one of the supported Google provider key variables. Neither check exposes secret values.

## Operational evidence required before calling it live

Repository/CI green is not operational green. A deployment is operationally ready only after the exact deployed revision proves all of the following:

1. authoritative server is running and the 10-Hz tick advances,
2. `MCP_ADMIN_TOKEN` is configured,
3. Streamable HTTP MCP initialize/list-tools succeeds against `/api/mcp`,
4. `genkit_gameplay_capabilities` returns the expected allowlist,
5. a real player exists in `RuntimePlayerSystem`,
6. a real operator action returns a canonical receipt,
7. its follow-up runtime state/snapshot proves the expected mutation,
8. no blocked capability is reported as successful.

No mock response, generated snapshot, static fixture, or CI label can substitute for these checks.

## Pattern borrowed from Echoes of Aurion

`OuroborosCollective/Echoes_of_Aurion` is used as a reference for its working MCP/player-control design: tiny command allowlist, monotone sequence numbers, explicit pairing/revocation boundaries, and a visible command ledger. Areloria intentionally does **not** copy Aurion's final browser-local command mutation. Areloria execution remains server-authoritative and evidence-bound.
