# 2D Weapon Asset Packs

Normalized from ZIP files uploaded by the repository owner in ChatGPT on 2026-05-19.

Source packs:
- FreePixelFantasyWeaponPack.zip
- FreePixelMeleeWeaponPack.zip
- oubliette_weapons _freefree_twg.zip

Generated output:
- /2d-assets/weapons/weapon-atlas.png
- /2d-assets/weapons/weapon-manifest.json

The manifest includes deterministic metadata:
- weaponClass
- rarity
- tags
- source
- sourcePath
- atlas frame coordinates

Integration recommendation:
Merge `weapon-manifest.json` entries into `/2d-assets/manifest.json` under `weapons`, or teach the client to additionally load `/2d-assets/weapons/weapon-manifest.json`.
