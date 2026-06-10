# Areloria Asset Intake Drop — 2026-06-10

This package contains deterministically named raw visual assets from the June 2026 manual drop.

## Integration rule

These files are **not gameplay truth** until they pass the Stitch 2.5D asset intake pipeline and appear in a validated runtime manifest.

```text
assets/raw/stitch/arelorian_manual_drop_2026_06_10
→ scripts/stitch_atlas_intake.py
→ assets/runtime/stitch/arelorian_manual_drop_2026_06_10/manifest.json
→ apps/client-2d/public/2d-assets/stitch/manifest.json or composed runtime manifest
→ /2d asset preview
```

## Deterministic naming

All assets use stable lower-snake-case names following:

```text
stitch_{category}_{description}_{sheet|catalog}.{ext}
```

No UUIDs, no Date.now, no Math.random.

## Assets

| Asset ID | Category | Status | Notes |
| --- | --- | --- | --- |
| `stitch_building_cyber_stone_village_house_set_catalog` | `building` | `manual_review` | Ancient cyber-tech stone village buildings; cottage/inn/dwelling catalog with multiple views, manual crop required. |
| `stitch_catalog_asset_collection_mobile_overview` | `catalog` | `reference_only` | Mobile overview/catalog of asset collections; reference-only, not runtime sprite source. |
| `stitch_enemy_undead_blade_walker_square_sheet` | `enemy` | `candidate_atlas` | Undead blade-walker enemy square sheet; candidate for 6x6 or 8x8 manual atlas extraction. |
| `stitch_equipment_overlay_crystal_armor_modular_sheet` | `equipment_overlay` | `candidate_atlas` | Crystal/obsidian/solar armor overlay modular sheet; candidate for manual equipment overlay extraction. |
| `stitch_hero_classless_human_worker_multi_action_sheet` | `hero` | `manual_review` | Human classless worker/action sheet; black background and irregular rows, manual alpha/slicing required. |
| `stitch_hero_cyber_knight_guard_multi_action_sheet` | `hero` | `manual_review` | Cyber-tech armored knight/guard multi-action sprite sheet; labels/grid require manual slicing. |
| `stitch_npc_eldritch_modular_gothic_assembly_catalog` | `npc` | `manual_review` | Eldritch modular gothic NPC assembly sheet; heads/torsos/legs catalog, manual crop required. |
| `stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog` | `prop` | `manual_review` | Eldritch modular gothic dungeon floors, walls and props; catalog sheet, manual crop required. |
| `stitch_tile_swamp_marsh_biome_tiles_props_backgrounds_sheet` | `tile` | `manual_review` | Swamp/marsh biome tiles, props and parallax backgrounds; irregular grid, manual classification/crop required. |
| `stitch_vfx_arelorian_elemental_spell_fx_square_sheet` | `vfx` | `candidate_atlas` | Arelorian elemental VFX sheet with cyan/ice/fire/lightning effects; candidate for VFX atlas extraction. |


## Next production step

Run the Stitch intake on the raw folder, then review quarantine/manual_review results.

```bash
pnpm assets:stitch:intake -- --input ./assets/raw/stitch/arelorian_manual_drop_2026_06_10 --output ./assets/runtime/stitch/arelorian_manual_drop_2026_06_10
pnpm assets:stitch:validate
```

Square 1536×1536 sheets may need explicit 6×6 / 256×256 support in the intake script. Irregular catalog sheets should stay manual_review until cropped into atomic runtime sheets.
