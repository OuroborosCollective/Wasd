# ARELogic Stitch Asset Integration Contract

This document defines how useful non-website assets from Google Stitch exports should be brought into Areloria/WASD without polluting runtime code, breaking determinism, or importing website-only scaffolding.

## Scope

Import useful game assets only:

- NPC sprites and portraits
- merchant, trader, gatherer, worker, market and camp visuals
- loot icons, rarity frames, item-card decorations
- marketplace and auction UI design references
- tooltip layouts and style tokens
- station icons for campfire, furnace, workbench
- POI symbols for logging, mining and fishing camps

Do **not** import:

- exported Stitch website shells
- standalone HTML landing pages
- unrelated marketing copy
- duplicated framework boilerplate
- remote analytics snippets
- generated package lockfiles from Stitch
- runtime code that mutates gameplay state client-side

## Asset Intake Folders

Preferred folders:

```txt
apps/client-2d/public/assets/stitch/npc/
apps/client-2d/public/assets/stitch/items/
apps/client-2d/public/assets/stitch/loot/
apps/client-2d/public/assets/stitch/market/
apps/client-2d/public/assets/stitch/poi/
apps/client-2d/public/assets/stitch/ui/
docs/stitch/
```

All imported assets must be referenced through a manifest before being wired into UI.

## Manifest First Rule

Every asset should be described in:

```txt
docs/stitch/STITCH_ASSET_MANIFEST.json
```

Required fields:

- `id`
- `kind`
- `source`
- `targetPath`
- `gameUse`
- `status`
- `notes`

Allowed `status` values:

- `candidate`
- `imported`
- `wired`
- `rejected`

## Determinism Rules

Assets are display-only. They must never decide gameplay outcomes.

Allowed:

- visual icon selection by deterministic item id
- rarity frame color by server-provided rarity
- NPC portrait by NPC id/type
- POI marker by POI type

Forbidden:

- client-generated loot rolls
- client-generated NPC state
- client-side inventory changes
- random icon mutation that affects gameplay identity
- remote asset fetches during gameplay

## Stitch Asset Mapping

### Loot Machine

| Game Concept | Asset Kind | Suggested IDs |
|---|---|---|
| Common item | rarity frame | `rarity_frame_common` |
| Magic item | rarity frame | `rarity_frame_magic` |
| Rare item | rarity frame | `rarity_frame_rare` |
| Epic item | rarity frame | `rarity_frame_epic` |
| Legendary item | rarity frame | `rarity_frame_legendary` |
| Mythic item | rarity frame | `rarity_frame_mythic` |
| Loot drop marker | icon/fx | `loot_drop_marker`, `loot_sparkle_legendary` |
| Item tooltip | UI panel | `diamond_glass_item_tooltip` |

### NPC / Market

| Game Concept | Asset Kind | Suggested IDs |
|---|---|---|
| Village trader | portrait/sprite | `npc_mira_quartermaster` |
| Camp miner | portrait/sprite | `npc_camp_miner` |
| Camp fisher | portrait/sprite | `npc_camp_fisher` |
| Camp woodcutter | portrait/sprite | `npc_camp_woodcutter` |
| Outpost market | UI/background | `mara_emporium_outpost_market` |
| Auction window | UI panel | `auction_market_window` |

### POI / Stations

| Game Concept | Asset Kind | Suggested IDs |
|---|---|---|
| Campfire | icon | `poi_campfire` |
| Furnace | icon | `poi_furnace` |
| Workbench | icon | `poi_workbench` |
| Mining camp | icon | `poi_mining_camp` |
| Fishing camp | icon | `poi_fishing_camp` |
| Logging camp | icon | `poi_logging_camp` |

## Integration Order

1. Export assets from Stitch.
2. Remove website shell files.
3. Copy only useful PNG/SVG/WebP/JSON design references into `apps/client-2d/public/assets/stitch/**` or `docs/stitch/**`.
4. Update `docs/stitch/STITCH_ASSET_MANIFEST.json`.
5. Wire assets through existing mapping layers such as item icon mapping, NPC marker layers, POI marker layers or loot tooltip UI.
6. Keep fallbacks for missing assets.
7. Add tests only when runtime code changes.

## Safety Checklist

- No website runtime imported.
- No new gameplay randomness.
- No client authority added.
- No root `2d/` changes.
- Existing `apps/client-2d` fallbacks still work.
- Assets are local and deterministic.
- UI strings are rendered as text, not raw HTML.
