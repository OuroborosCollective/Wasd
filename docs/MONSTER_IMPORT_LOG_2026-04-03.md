## Monster Pack Import Log (2026-04-03)

Source folder:
- https://drive.google.com/drive/folders/18m4KpzpEzhC9wl7jzr6dUc0N8Jozr79C

What was integrated:
- Big pack glTF set
- Blob pack glTF set

Runtime destination:
- `client/public/assets/models/monsters`
  - `big_*.gltf`
  - `blob_*.gltf`
  - `big_Atlas_Monsters.png`
  - `blob_Atlas_Monsters.png`

Mapping updates:
- `game-data/world/asset-pools.json`
  - `defaults.monsters` now points to Big/Blob model variants.
  - `pools.monsters` updated for:
    - `default`
    - `goblin`
    - `wolf`
    - `boar`
    - `undead`
    - `legion_scout`
    - `legion_brute`
    - `legion_overseer`
  - additional direct monster keys from imported file names were added for no-code usage.

Validation:
- Full asset-pool path check completed with `missing_count = 0`.
- Client/server builds pass after import.

Known note:
- The `Flying` section in this Drive folder was incomplete for glTF in this run
  (one Google Drive file could not be fetched by gdown and no `glTF` subfolder was available in the downloaded subset).
  Big + Blob content is fully integrated and usable now.
