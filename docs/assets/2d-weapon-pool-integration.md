# 2D Weapon Visual Pool Integration

This repo now supports weapon visual entries in the 2D asset manifest schema.

## Runtime contract

Generated loot should keep server-side gameplay truth separate from client-side visuals:

```json
{
  "id": "item_abc123",
  "type": "weapon",
  "weaponClass": "sword",
  "rarity": "rare",
  "seed": "loot:orc:12345",
  "visualId": "weapon_sword_rare_003"
}
```

The 2D client resolves visuals through the asset manifest:

```ts
pickWeaponVisual(manifest, {
  visualId: item.visualId,
  weaponClass: item.weaponClass,
  rarity: item.rarity,
  seed: item.seed ?? item.id,
});
```

## Manifest shape

```json
{
  "weapons": {
    "weapon_sword_rare_003": {
      "src": "/2d-assets/weapons/weapon-atlas.png",
      "weaponClass": "sword",
      "rarity": "rare",
      "tags": ["sword", "rare"],
      "frame": { "x": 128, "y": 64, "w": 64, "h": 64 }
    }
  }
}
```

## Uploaded weapon packs

A normalized full weapon-pool artifact was generated from:

- `FreePixelFantasyWeaponPack.zip`
- `FreePixelMeleeWeaponPack.zip`
- `oubliette_weapons _freefree_twg.zip`

The generated artifact contains:

- 270 weapon visuals
- one compact atlas PNG
- one weapon manifest with `weaponClass`, `rarity`, source path and atlas frame metadata

## Next implementation step

Copy the generated artifact into the repository root so these files exist:

```text
apps/client-2d/public/2d-assets/weapons/weapon-atlas.png
apps/client-2d/public/2d-assets/weapons/weapon-manifest.json
apps/client-2d/public/2d-assets/credits/weapon-packs.md
```

Then either:

1. merge the `weapons` object into `/2d-assets/manifest.json`, or
2. extend the 2D client to load `/2d-assets/weapons/weapon-manifest.json` in addition to the root manifest.

Do not let the client randomly select weapon visuals. Use `visualId` from the server when present, otherwise deterministic selection by `weaponClass`, `rarity` and item seed.
