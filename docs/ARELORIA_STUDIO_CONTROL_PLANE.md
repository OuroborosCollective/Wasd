# Areloria Studio Control Plane

## Purpose

Areloria Studio is the owner/admin editing plane for the WASD game repository and runtime. It is designed so an authorized MCP operator can modify authored content, presentation, render settings, repository code, model bindings and world placements without creating a second gameplay authority.

The core boundary is:

```text
Owner request
  -> Areloria Studio MCP tool
  -> hash/schema/permission gate
  -> authored config / repository / approved live admin effect
  -> build or reload when required
  -> runtime/persistence readback
  -> existing server-authoritative Tick / CanonicalIntent / WorldHash remains truth
```

2D and 3D are presentation projections of the same gameplay truth. A model, sprite, material or quality profile may change without changing actor identity, position, combat state, loot result, quest state or world hash.

## Server architecture

Areloria Studio extends the existing `/api/mcp` SSE server. It does **not** add a second NPC server or a second game server.

The same server already owns:

- server-authoritative gameplay;
- the 10 Hz / canonical intent truth path;
- NPC runtime;
- admin content endpoints;
- Asset Brain persistence;
- GLB registry;
- placement engine;
- asset pools;
- PostgreSQL.

Studio adds typed tools on top of those boundaries rather than duplicating them.

## Authentication

Mutation MCP routes remain protected by `MCP_ADMIN_TOKEN`.

Live admin effects reuse the existing internal admin boundary and require one of:

- `ADMIN_PANEL_TOKEN`
- `GM_PANEL_TOKEN`

The Studio tools do not return these values.

The only public Studio endpoint is:

```text
GET /api/mcp/presentation-config
```

It is read-only and exposes only presentation bindings, render profiles and their SHA-256 values. It contains no token, database credential or gameplay state.

## Universal authored-content editing

The hash-bound game-data editor can list/read/write/upsert/delete JSON under `game-data/`.

This includes the existing Areloria domains such as:

- quests and quest lines;
- quest NPC authored definitions;
- monsters and drops;
- NPC definitions and schedules/routes;
- lore, dialogue, cultures and religions;
- factions, governance and politics;
- economy and trade;
- auction configuration;
- crafting, recipes and items;
- skills and equipment;
- structures, housing and settlements;
- biomes, vegetation, weather and world data;
- UI configuration;
- scenes, spawns and resources.

Writes are atomic and use an optional expected SHA-256 to prevent editing a stale file. Each successful write returns before/after/readback hashes and marks itself as authored configuration rather than runtime gameplay truth.

Canonical truth-index files are blocked from ordinary Studio writes.

## Repository/code editing

Menus and game systems sometimes require source changes rather than authored JSON. The Studio repository tools therefore support:

- file read with SHA-256;
- bounded repository listing;
- complete hash-bound text writes;
- exact fragment replacement with expected occurrence count.

Allowed subtrees include the real game clients, server, packages, scripts, docs and workflows. `.env`/credential files are blocked.

Every repository write receipt states that a build and runtime readback are still required. A successful filesystem write is never treated as a successful deployment.

## Runtime asset database

`studio_runtime_assets` is the DB-backed presentation asset catalog.

Each row can contain:

```text
id
kind
runtime_uri
content_sha256
source_specification_id
label
metadata
enabled
created_at
updated_at
```

Supported kinds include:

- `2d_sprite`
- `2d_atlas`
- `3d_glb`
- `3d_gltf`
- `texture`
- `audio`
- `other`

This catalog complements Asset Brain. Asset Brain remains useful for specifications and variants; the Studio runtime catalog binds a reviewed artifact to the URI actually used by a client.

## Shared 2D/3D presentation contract

`game-data/visual/presentation_bindings.json` binds semantic targets to presentation assets.

Example:

```json
{
  "bindingId": "goblin-village-guards",
  "targetType": "monster_group",
  "targetId": "goblin_guard",
  "presentation2d": {
    "kind": "atlas",
    "atlasUrl": "/assets/sprites/goblins.json",
    "frame": "guard_idle_0",
    "scale": 1
  },
  "presentation3d": {
    "kind": "model",
    "modelUrl": "/assets/models/monsters/goblin_guard.glb",
    "scale": 1
  }
}
```

Presentation documents may not carry fields such as `tickId`, `worldHash`, `CanonicalIntent`, `intentHash`, `logicalIndex` or `kappa`.

## 2D client

The active 2D path now uses `LiveAuthoritativeWorld2D`.

It:

- reads `WORLD_HEARTBEAT` / world tick data;
- displays players/NPCs/loot from the live server;
- consumes the shared presentation feed;
- supports sprite/atlas replacement;
- hot-refreshes visual bindings;
- applies the active 2D quality profile;
- never generates local gameplay chunks;
- never owns movement truth;
- never sends gameplay actions from the renderer.

The previous `DeterministicWorldIsoAppFuture` remains historical/reference code but is no longer the active renderer exported by the HUD bridge.

The former hard-coded `Architect` identity and renderer-derived fake vitals are removed from the active bridge. Input requests are forwarded to the existing canonical client-action/network path.

## 3D client

The real `/3d/` client remains Babylon.js + `MMORPGClientCore` + live WebSocket state.

`StudioPresentationEngineBridge` wraps the existing `BabylonAdapter` and is presentation-only.

It may hot-switch `modelUrl` for an existing entity, but forwards all identity, position, rotation, visibility, input and gameplay operations unchanged.

A presentation refresh does not manufacture a new entity or mutate authoritative state.

## Render / graphics profiles

`game-data/visual/render_profiles.json` currently defines:

- `performance`
- `balanced`
- `high`
- `cinematic`

2D settings include resolution scale, FPS limit, antialiasing and visual budgets.

3D settings include hardware scaling, FPS, antialiasing, shadows, particles, fog, tone mapping, texture quality metadata, LOD bias metadata and render distance.

2D and 3D can select different active profiles.

The 3D client hot-applies supported Babylon engine/scene settings without restarting gameplay state.

## Model management

Studio can:

- scan GLB/glTF files already present in the client model library;
- read Asset Brain specifications/variants;
- create and remove DB runtime-asset rows;
- bind a DB asset to 2D, 3D or both views;
- set/remove a shared presentation binding;
- set/remove a live GLB link;
- edit asset pool entries;
- edit the default model list for an asset category;
- reload runtime asset pools;
- read back the resulting runtime state.

Deleting a DB runtime-asset row does not delete the binary asset itself. File deletion should be a separate, explicit repository operation.

## World / environment building

Studio reuses the existing placement engine.

It can place/remove one asset or a batch of up to 500 placements. Batch placement is deterministic in supplied order and can roll back successfully placed IDs if a later placement fails.

This is suitable for authored placement of:

- houses;
- village components;
- walls and gates;
- market stalls;
- roads and bridges;
- city blocks;
- vegetation/rocks/props;
- landmark pieces;
- dungeon entrances;
- trade-route markers.

For procedural terrain, mountains, biome algorithms or new Babylon rendering techniques, Studio uses the hash-bound repository tools to edit the appropriate world/biome/Babylon implementation and then requires build + runtime evidence.

## Game systems

The Studio is intentionally not limited to assets. Since it can edit both game-data and code, it can implement owner requests touching:

- quest requirements and quest chains;
- NPC behavior/routes/needs;
- monster behavior/routes/drops;
- factions and politics;
- trade and economy;
- auction house;
- settlements and housing;
- dialogue and lore;
- menus and HUD logic;
- rendering and engine configuration;
- gameplay systems that require server code changes.

However, a request that changes gameplay semantics must still go through the real repository build/test/deploy/runtime evidence path. Studio never labels a source edit as a live gameplay success.

## Important tools

### Discovery / content

```text
studio_capabilities
studio_list_domains
studio_list_json
studio_read_json
studio_write_json
studio_upsert_json_entry
studio_delete_json_entry
studio_validate_content
```

### Code / menus / engine logic

```text
studio_repo_read
studio_repo_list
studio_repo_write_text
studio_repo_replace_text
```

### Models / assets

```text
studio_scan_3d_models
studio_asset_brain_get
studio_runtime_asset_list
studio_runtime_asset_upsert
studio_runtime_asset_delete
studio_activate_database_asset
studio_live_glb_link_set
studio_live_glb_link_remove
studio_live_asset_pools_get
studio_live_asset_pool_set
studio_live_asset_pool_set_default
studio_live_asset_pools_reload
```

### Presentation / rendering

```text
studio_presentation_get
studio_presentation_set_binding
studio_presentation_remove_binding
studio_render_profiles_get
studio_render_profile_set
studio_render_profile_activate
```

### World building

```text
studio_live_world_place
studio_live_world_remove
studio_live_world_batch_place
studio_live_world_batch_remove
```

### Evidence / preview

```text
studio_live_content_preview
studio_runtime_readback
```

## Root Cyber-Zen page

The root HTML page in `client/index.html` is a launcher/showcase that links to `/3d/`, `/2d/` and the portal. It is not the Babylon game renderer.

The actual 3D gameplay entry is `client/src/main.ts`.

The active 2D gameplay entry is `apps/client-2d/src/main.tsx`.

If the owner wants the root launcher removed, redesigned or made configurable, that is now a normal hash-bound repository/UI edit; it is not treated as gameplay truth.

## Operational prerequisites

For read-only presentation in the browser, no owner secret is exposed to the client.

For owner/admin MCP mutation, deployment needs `MCP_ADMIN_TOKEN`.

For live asset/placement effects called internally by Studio, deployment also needs `ADMIN_PANEL_TOKEN` or `GM_PANEL_TOKEN`. If those are already present in the production environment, no additional setting is needed.

PostgreSQL must be configured for the runtime asset catalog. Migration `1787110800000_add-studio-runtime-assets.js` creates the table during the normal migration chain.

## Completion standard

Areloria Studio is considered usable only when CI proves:

1. server TypeScript compilation;
2. Studio contract tests;
3. 2D production build;
4. 3D production build;
5. Areloria architecture guard;
6. WorldTick determinism guard;
7. MCP registration and presentation route contracts;
8. migration/source contract;
9. exact-head revision guardian before merge.

Production/live effects remain `UNVERIFIED` until the merged revision is deployed and the Studio runtime readback confirms the deployed environment.
