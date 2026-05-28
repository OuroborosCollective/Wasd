# PixiJS Dev Hub Asset Pack Integration for WASD / Arelorian

Source: https://pixi-js-dev-hub--arschniga1337.replit.app/hub-data.json

## Goal

Use the useful 2D asset packs from the PixiJS Developer Hub as visual content for the existing `apps/client-2d` pipeline without changing the authoritative Arelorian simulation.

## Hard rules

- Asset packs are visual input only.
- `WorldTick` and `AREKernel` remain authoritative.
- No sprite, atlas, tile, animation or Pixi scene may create authoritative gameplay state.
- Server registries and snapshots define real items, NPCs, entities, positions and combat results.
- Imported assets must pass license, attribution, filename, atlas, manifest and mobile-performance validation.
- Prefer CC0 packs for direct repo integration.
- Attribution-required and ShareAlike packs must stay isolated with explicit credits metadata.

## First integration batch

| Asset pack | Decision | Priority | License | Use in Arelorian |
|---|---:|---:|---|---|
| Kenney Tiny Town | adopt | P0 | CC0 | Towns, roads, houses, trees, interiors, admin-map placeholders |
| Kenney Tiny Dungeon | adopt | P0 | CC0 | Dungeon rooms, doors, chests, traps, enemy placeholders, boss rooms |
| Ninja Adventure | adopt | P0 | CC0 | Broad top-down RPG terrain, characters, items and VFX prototype pack |
| Explosion Animations | adopt | P0 | CC0 | Impact Buster, spell hit, loot burst, ARE shockwave, combat feedback |
| Free Pixel Food | adopt | P1 | CC0 | Food, consumable and crafting inventory icons |
| Kenney UI Pack | adopt | P1 | CC0 | HUD, skillbar, inventory, mobile UI, admin UI prototypes |
| Pixel Prototype Player Sprites | adopt | P1 | CC0 | Temporary player and NPC placeholders for animation and movement tests |

## Recommended repo targets

```txt
apps/client-2d/public/2d-assets/incoming/<pack-id>/
apps/client-2d/public/2d-assets/atlases/<pack-id>/
apps/client-2d/public/2d-assets/icons/<category>/
apps/client-2d/public/2d-assets/vfx/<pack-id>/
apps/client-2d/public/2d-assets/ui/<pack-id>/
apps/client-2d/public/2d-assets/characters/<pack-id>/
apps/client-2d/public/2d-assets/manifests/
apps/client-2d/public/2d-assets/credits/
```

## Use model

The client may render imported sprites, icons, effects and tiles from server-approved snapshots or events:

```ts
pixiHud.render(snapshot);
pixiVfx.play(serverApprovedCombatEvent);
pixiMap.draw(serverDerivedChunkMap);
```

The client must not derive core gameplay truth from visual asset placement:

```ts
// forbidden
sprite.x += velocity * delta;
clientWorld.spawnLootFromSpriteCollision();
```

## Adapt later

These packs are useful but must not be bulk-imported without license and attribution handling:

- Shikashi fantasy icons: CC-BY attribution required.
- Pixel isometric tiles: CC-BY attribution required.
- LPC base assets: CC-BY-SA, ShareAlike isolation required.
- LPC tile atlas: CC-BY-SA, ShareAlike isolation required.
- CraftPix/GameArt2D freebies: verify exact terms per selected pack before import.

## Agent checklist

1. Download only from official source pages.
2. Keep exact source URL and license in credits metadata.
3. Normalize filenames to kebab-case.
4. Build Pixi-compatible manifests and atlas metadata.
5. Keep binary imports small and mobile-friendly.
6. Run `pnpm --filter @wasd/client-2d validate:assets` after import.
7. Do not change `WorldTick`, `AREKernel`, network authority or server registries during asset import.
