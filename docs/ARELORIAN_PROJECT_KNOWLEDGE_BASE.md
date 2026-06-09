# Arelorian Project Knowledge Base

> Conversation-derived project memory for future contributors, agents, and maintainers.
>
> Curated: 2026-06-09

This document preserves recurring project facts, architectural decisions, and hard-earned lessons from prior planning, debugging, deployment, and implementation conversations. Treat it as a living knowledge base: update it whenever a major gameplay, deployment, or deterministic simulation decision becomes stable.

## 1. Project identity

Arelorian / WASD is a browser-native deterministic MMORPG engine and living-world simulation platform.

Core direction:

- Browser MMORPG with Android-first usability.
- Authoritative Node.js / TypeScript server.
- Deterministic 10 Hz simulation loop.
- Client renders and sends intent; server owns truth.
- Living-world systems: NPC memory, economy, crafting, factions, settlements, governance, and emergent behavior.
- ARE logic / Ouroboros loop as the architectural discipline for state, causality, and repeatable simulation.

## 2. Repository and runtime facts

Important repository facts:

- Repository: `OuroborosCollective/Wasd`
- Default branch: `main`
- Main live client target: `apps/client-2d`
- Server target: `server/`
- VPS deployment path: `/opt/areloria`
- Production route of interest: `/2d/`

Practical rule: before changing UI, verify that the modified file is part of the real `apps/client-2d` bundle. Avoid editing dead, legacy, or preview-only 2D paths unless a task explicitly says so.

## 3. MVP loop that matters most

The highest-value near-term gameplay loop is:

```text
Login
  -> Character identity
  -> Enter 2D world
  -> Gather resources
  -> Process resources at stations
  -> Sell processed goods to village trader
  -> Persist wallet / inventory / progression
  -> Show feedback in HUD / inventory / paperdoll
```

Do not bury this loop under too many parallel systems. This is the spine that can make the game feel real.

## 4. Character and paperdoll knowledge

Desired behavior:

- Character profile is server-authoritative.
- Name, archetype, equipment, and paperdoll snapshot persist.
- Client may request changes, but should not freely mutate identity, equipment, wallet, or inventory.
- Login should reliably lead to visible character or paperdoll state.
- Character identity should bind together login, inventory, equipment, economy, quests, and world presence.

Implementation principle:

```text
Client request -> server validation -> authoritative mutation -> snapshot/event -> client render
```

Never use the client as the source of truth for character state.

## 5. Resource economy knowledge

Useful resource examples:

- `wood_log -> wood_plank`
- `copper_ore -> copper_ingot`
- `raw_fish -> cooked_fish`

Design intent:

- Raw resources are useful but low-value.
- Processed resources sell for more.
- Processing should require the correct station.
- Selling should require proximity to a valid trader.
- Server validates all resource, crafting, and selling rules.

Recommended station contract:

- `wood_log -> wood_plank` near `Workbench`
- `copper_ore -> copper_ingot` near `Furnace`
- `raw_fish -> cooked_fish` near `Campfire`

Recommended trader contract:

- Client sends a sell intent.
- Server checks authenticated / bound player identity.
- Server resolves player position.
- Server checks valid vendor / village trader proximity.
- Server mutates inventory and wallet only after all validation passes.
- Failure must not mutate state.

Common fail reasons worth preserving in APIs/tests:

- `vendor_too_far`
- `missing_vendor`
- `invalid_vendor`
- `missing_player_position`
- `invalid_player_position`
- `missing_station`
- `invalid_station`
- `station_too_far`
- `missing_recipe`
- `missing_ingredients`

## 6. Boot and live-route knowledge

Known live-route pain points:

- `/2d/` must load the real client bundle.
- Login success is not enough; the post-login world, HUD, dock, and character/paperdoll surface must be visible.
- If Pixi or asset boot fails, UI should still render a diagnostic fallback instead of a blank screen.
- Live bundles should expose verifiable markers so deploys can prove which bundle is currently served.

Recommended boot contract:

```text
LoginGate entered
  -> deterministic-world-root visible
  -> HUD shell visible
  -> dock visible
  -> world canvas or recoverable boot error visible
  -> character select or paperdoll visible
```

Do not couple all UI visibility to successful renderer boot. The shell is the rescue rope.

## 7. Determinism rules

Global simulation rules:

- Server is authoritative.
- Client sends intent, never truth.
- Do not use `Math.random()` for gameplay state.
- Do not use `Date.now()` as gameplay causality.
- Use logical ticks, stable seeds, stable IDs, and explicit inputs.
- Tick order must be deterministic.
- Sort collections before deterministic resolution when order matters.
- Persist snapshots/events with explicit versioning.
- Fail closed on invalid input.
- Never mutate state on failed validation.

Acceptable places for wall-clock time:

- Logging.
- Observability.
- Deployment metadata.
- Human-facing timestamps.

Not acceptable for deterministic simulation:

- Loot rolls.
- Combat resolution.
- NPC decisions.
- Economy mutation.
- Crafting outcomes.
- Quest progression.

## 8. SelfHeal knowledge

SelfHeal should be a safe repair planner, not a blind autopilot.

Expected flow:

```text
Detect issue
  -> classify root cause
  -> propose patch
  -> estimate risk
  -> provide dry-run diff/plan
  -> include rollback plan
  -> apply only when policy allows
```

Recommended policy:

- `LOW` risk can be auto-applied only for narrow, well-tested, reversible changes.
- `MEDIUM` risk should require explicit approval.
- `HIGH` / `BLOCKED` risk must not auto-apply.
- SelfHeal IDs should be deterministic, e.g. stable hash from issue signature and target path.
- Avoid `Math.random()` and `Date.now()` for patch identity or policy decisions.

Good SelfHeal targets:

- Missing docs links.
- Known route regressions.
- Build script drift.
- Safe import suffix fixes.
- Known ESM/CJS pattern rewrites with tests.
- Broken asset manifest entries with quarantine.

Bad SelfHeal targets:

- Silent gameplay balancing changes.
- Security policy changes without approval.
- Destructive file deletes.
- Database migrations without backups.
- Anything involving secrets.

## 9. Stitch / asset knowledge

Stitch-generated assets should be imported through the established asset pipeline and manifests, not manually scattered.

Useful naming discipline:

```text
{class}_{race}_{gender}_{direction}_{animation}.png
```

For performance and maintainability, prefer atlas-based output when possible:

```text
paladin_human_male.atlas.png
paladin_human_male.atlas.json
```

Asset rules:

- Manifest first, renderer second.
- Stable asset IDs.
- Missing assets should degrade to placeholders, not crash the game.
- Corrupt assets should be quarantined and logged.
- Android/browser performance matters; avoid massive loose sprite folders when an atlas is better.

## 10. Security knowledge

Never commit secrets, keys, passwords, tokens, or private deployment credentials into docs, prompts, logs, screenshots, or test fixtures.

If a secret appears in a conversation export, issue, PR, artifact, or logs:

1. Do not quote it back.
2. Rotate/revoke the secret.
3. Remove or restrict the exposed artifact where possible.
4. Replace the workflow with GitHub Actions secrets or VPS-local `.env` values.

Preferred secret locations:

- GitHub Actions Secrets.
- VPS-local `.env` under `/opt/areloria`.
- Provider-specific secret managers.

Forbidden locations:

- Markdown docs.
- Source files.
- PR descriptions.
- Chat prompts.
- Public artifacts.

## 11. Practical next priorities

Focus first:

1. Keep `/2d/` boot reliable.
2. Make the MVP loop visible and satisfying.
3. Strengthen server-authoritative inventory, wallet, character, and crafting.
4. Add tests for success and fail-closed cases.
5. Keep docs indexed and current.

Then expand:

- Deeper NPC memory.
- Regional economy.
- Tool crafting.
- Guilds and settlements.
- Trading.
- Faction reputation.
- Politics/governance.
- Procedural dungeons and world bosses.

## 12. Rule of thumb

When choosing between a spectacular new system and a boring reliability fix, pick the reliability fix until the core loop is stable.

A living world only impresses players if they can actually enter it, understand it, and make progress inside it.
