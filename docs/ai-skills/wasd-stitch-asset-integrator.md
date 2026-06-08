# WASD Stitch Asset Integrator Skill

Use this skill when importing useful non-website assets from Google Stitch into Areloria/WASD.

## Mission

Extract only assets that improve the game client:

- NPC portraits/sprites
- item and loot icons
- rarity frames
- tooltip panels
- market/vendor panels
- POI and station icons
- design references for future server-authoritative UI

Never import Stitch website shell code into gameplay runtime.

## Required Inputs

- Stitch project/export folder or files
- Target game concept, such as loot, NPC, market, POI, station, tooltip
- Whether asset is runtime-ready or reference-only

## Repository Rules

- Do not touch root `2d/`.
- Client source is `apps/client-2d`.
- Put local runtime assets under `apps/client-2d/public/assets/stitch/**`.
- Put reference-only designs under `docs/stitch/**`.
- Update `docs/stitch/STITCH_ASSET_MANIFEST.json` for every imported candidate.
- Assets are display-only; gameplay remains server-authoritative.
- No client-side loot rolls, inventory mutation, economy mutation, or NPC state mutation.

## Useful Target Paths

```txt
apps/client-2d/public/assets/stitch/npc/
apps/client-2d/public/assets/stitch/items/
apps/client-2d/public/assets/stitch/loot/
apps/client-2d/public/assets/stitch/market/
apps/client-2d/public/assets/stitch/poi/
apps/client-2d/public/assets/stitch/ui/
docs/stitch/
```

## Integration Pattern

1. Inspect exported files.
2. Reject website shell and framework scaffolding.
3. Keep only PNG/SVG/WebP/JSON design reference assets.
4. Normalize names to kebab-case.
5. Add manifest entry.
6. Wire into existing display mapping only when safe.
7. Preserve fallback emoji/icon behavior.
8. Run available tests/typecheck/entrypoint guard.

## Runtime Mapping Candidates

### Loot

- `rarity_frame_common`
- `rarity_frame_magic`
- `rarity_frame_rare`
- `rarity_frame_epic`
- `rarity_frame_legendary`
- `rarity_frame_mythic`
- `diamond_glass_item_tooltip`

### NPC

- `npc_mira_quartermaster`
- `npc_camp_miner`
- `npc_camp_fisher`
- `npc_camp_woodcutter`

### Market

- `mara_emporium_outpost_market`
- `auction_market_window` reference only until server market contract exists

### POI / Stations

- `poi_campfire`
- `poi_furnace`
- `poi_workbench`
- `poi_mining_camp`
- `poi_fishing_camp`
- `poi_logging_camp`

## Acceptance Checklist

- Manifest updated.
- Website shell excluded.
- No remote runtime dependencies.
- No gameplay authority moved to client.
- Fallbacks still work when asset missing.
- UI renders text safely.
- Documentation updated.
