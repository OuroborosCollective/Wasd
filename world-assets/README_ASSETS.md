# World Assets

**Workflow:** Dateien hier ablegen → `pnpm run dev` / `pnpm run build` im **Client** (oder `pnpm run sync:world-assets`) → im Spiel **`/assets/models/world-assets/<unterordner>/<datei>.glb`**. Details: **`HOW_TO_ADD_GLBS.md`**.

Lege hier GLB-Assets ab:
- characters/
- monsters/
- buildings/
- equipment/armor/, equipment/shields/
- props/weapons/, props/deko/, props/armor_pieces/ (sonstiges unter props/)
- admin/ (Uploads: möglichst ohne Leerzeichen im Dateinamen)
- vegetation/ (optional)

Beispiele:
- uschi_gossip.glb
- warrior_male.glb
- warrior_female.glb
- castle_gate.glb
- castle_watch_tower.glb
- tree_oak_spring.glb
- gm_giraffe.glb