# Entwurf vs. Live (No-Code / Content)

| Ebene | Was passiert | Wo |
|--------|----------------|-----|
| **Live (Standard)** | Server liest **`game-data/`** (oder `published-content/current/` wenn `USE_PUBLISHED_CONTENT=1` / `CONTENT_PACK_DIR`). | `.env`, `contentDataRoot` |
| **Veröffentlichter Pack** | Admin **„Inhalt veröffentlichen“** kopiert validiertes `game-data/` nach **`published-content/current/`**. Live nutzt das nur mit obiger Env. | `publishContentPackFromRepo` |
| **GLB-Zuordnungen** | **`glb-links.json`** oder Spacetime **`glb_link`** — sofort wirksam nach Server-Neustart / Registry-Reload je nach Setup. | Admin „Modell verknüpfen“ |
| **Nur lesen im Admin** | Vorschau-Buttons (Quest / Dialog / NPC) zeigen JSON — **keine** direkte Dateischreibung aus dem Browser. | `GET /content-preview` |

**Empfehlung:** Inhaltsänderungen in Git committen oder über einen klaren Publish-Schritt ausrollen; auf dem VPS nach Deploy **`bash deploy/pull-and-deploy.sh`**.

**Später:** Dedizierter „Entwurf“-Ordner + Merge in `game-data` wäre ein separates Feature (nicht automatisch mit Vorschau verbunden).
