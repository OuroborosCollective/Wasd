# GLBs in `world-assets/` ablegen

## Ziel

Alles, was du hier ablegst, landet nach dem Sync **automatisch** an zwei Stellen:

1. **`client/public/assets/models/world-assets/`** → wird mit dem **Vite-Build** ausgeliefert unter  
   **`/assets/models/world-assets/…`** (funktioniert auch **ohne** extra Server-Mount — wichtig für VPS nur mit `client/dist`).
2. **`client/public/world-assets/`** → für Dev/Legacy unter **`/world-assets/…`**.

Die **Quelle** ist immer nur **`world-assets/`** im Repo-Root.

## So geht’s (minimaler Aufwand)

1. Lege fertige **`.glb`** / **`.gltf`** hier ab, z. B.:
   - `world-assets/characters/mein_npc.glb`
   - `world-assets/buildings/haus_a.glb`
   - `world-assets/props/brunnen.glb`

2. **Sync ausführen** (passiert automatisch vor Client-Dev und -Build):
   - Root: `pnpm run sync:world-assets`
   - oder: `node scripts/sync-world-assets.mjs`
   - Client: `pnpm run dev` / `pnpm run build` im Ordner **`client/`** (läuft **`predev`** / **`prebuild`**)

3. **Pfade in `game-data`:** Nutze **`/assets/models/world-assets/…`** (nicht mehr `/world-assets/…`), z. B.  
   `/assets/models/world-assets/characters/mein_npc.glb`

4. **Zuordnung zu NPCs / Objekten:** `game-data/glb-links.json`, `game-data/world/objects.json`, Asset-Pools — immer mit dem Pfad aus Schritt 3.

## Warum nicht alles direkt in Git?

Große GLB-Sammlungen (z. B. 600+ Dateien) sprengen oft Repo-Größe. Du kannst **`world-assets/`** auf dem Server befüllen und vor dem Build **`node scripts/sync-world-assets.mjs`** laufen lassen (siehe **`deploy/deploy.sh`**).

## Alternative: Nur `client/public/assets/models/`

Ohne `world-assets/`-Workflow: Dateien direkt unter `client/public/assets/models/…` ablegen und Pfade **`/assets/models/…`** verwenden (z. B. No-Code-Admin-Upload).
