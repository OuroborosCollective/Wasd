# GLBs in `world-assets/` ablegen

## So geht’s (minimaler Aufwand)

1. Lege deine fertigen **`.glb`**-Dateien hier ab, z. B.:
   - `world-assets/characters/mein_npc.glb`
   - `world-assets/buildings/haus_a.glb`
   - `world-assets/props/brunnen.glb`

2. **Build / Client-Build:** Beim **`npm run build`** im Ordner **`client/`** läuft automatisch **`prebuild`** → Sync nach `public/world-assets/`.  
   Root-Workflow: `pnpm run dev` führt zuerst **`pnpm run sync:world-assets`** aus.  
   Manuell: `pnpm run sync:world-assets` oder `node scripts/sync-world-assets.mjs`.

3. Im Spiel sind die Dateien dann unter **`/world-assets/...`** erreichbar, z. B.  
   `/world-assets/characters/mein_npc.glb`

4. **Zuordnung zu NPCs / Objekten:** Trage die URL in **`game-data/glb-links.json`** (NPCs, Monster, …) bzw. **`game-data/world/objects.json`** (`glbPath` pro Objekt) ein — oder schick eine **Liste** (Dateiname → NPC-ID / Objekt-ID), dann kann das jemand im Repo einpflegen.

## Warum der Sync?

Vite liefert nur **`client/public/`** aus. Der Ordner `world-assets/` im **Repo-Root** ist eure **Quelle**; `sync-world-assets` kopiert nach `client/public/world-assets/` (wird bei Build/Dev überschrieben, immer aktuell).

## Alternative: `client/public/assets/models/`

Wenn du explizit den **GLBRegistry**-Upload-Pfad nutzen willst: siehe Root-`README` / Agenten-Doku — Pfade **`/assets/models/...`** und **`glb-links.json`**.
