# Cursor-Instanz: Status-Logbuch (Handoff)

Diese Datei fasst den Projektverlauf und den **aktuellen Stand** zusammen, damit eine neue Cursor-Instanz ohne vollen Chat-Kontext einsteigen kann.  
**Pflege:** Bei größeren Meilensteinen kurz nachtragen (Datum, was geändert wurde, offene Punkte).

**Stand der Zusammenfassung:** 2026-04-01 (Branch: siehe unten, letzter bekannter Fokus: No-Code-Admin + GLB-Pipeline).

---

## 1. Projekt in einem Satz

**Arelorian / Ouroboros** — Browser-MMORPG als pnpm-Monorepo: **`server/`** (Express + WebSocket), **`client/`** (Vite + **Babylon.js** als primäre 3D-Engine). Zielrichtung: **datengetriebene No-Code-/Low-Code-Content-Plattform** für Admins (Welt, NPCs, Quests, GLB, Publishing), angebunden an die echte Spielruntime.

---

## 2. Chronologischer Überblick (Chat / Entwicklung)

| Phase | Inhalt (kurz) |
|--------|----------------|
| Deployment / Client-Pfad | VPS: falscher Pfad zu `client/dist` → behoben (Repo-Root / Symlink / Nginx). |
| Performance Mobile | Starke Lags & Abstürze Android → u. a. Babylon-Tuning, `hardwareScalingLevel`, `maxFPS`, kein `preserveDrawingBuffer`, serialisiertes GLB-Laden, weniger Pick/UI-Last, Namens-Tags optimiert. |
| Doku | PlayCanvas entfernt/aus Doku, Babylon als Engine, README/AGENTS/Status-Dokumente, Roadmap, Design-Bible-Bezug. |
| Gameplay | Combat (Targeting, Reichweite, Aggro/Leash), Tod/Respawn, Loot/Gold, HUD (HP/Stamina/Mana/Level), Mobile-UI (Bottom-Sheets, Loot-Strip, Reticle), Web Audio / Babylon-Sounds. |
| Persistenz | Spieler-Persistenz (Firestore + JSON-Fallback), Login-Policy (Firebase / Gast / Dev), Mana-Regen, `use_item`, Health-Endpoint-Stats. |
| Auth / Production | Client `getIdToken(true)`, Server Firebase Admin robust (`FIREBASE_SERVICE_ACCOUNT_KEY` parsen, `FIREBASE_PROJECT_ID`), `REQUIRE_FIREBASE_AUTH` für Production-Kontext. |
| Skills / UI | Aktive Skills mit Mana & Cooldowns, Skill-Bar, WS-Tests, Playwright in CI, Rate-Limits pro UID, Firebase E-Mail/Reset im HUD. |
| SpacetimeDB | Optional: GLB-Link-Speicher statt/alternativ zu `glb-links.json` — HTTP SQL, Rust-Modul `spacetimedb-modules/areloria-glb`, SATS-JSON Row-Parsing, Merge mit Datei. |
| No-Code-Admin | REST `/api/admin/content/*`, `admin-content.html`: deutsch, geführte Schritte, Choices aus `game-data`, Validierung + Publish-Pack, Animationen/Feedback, Firebase- oder Token-Auth. |
| GLB-Galerie (aktuell) | `GET .../glb-gallery-tree`, `POST .../glb-upload`, UI-Galerie + Upload; siehe Abschnitt 5. |

---

## 3. Architektur-Schnellreferenz

### 3.1 Start & Ports
- Dev: `pnpm run dev` (Vite eingebettet, Port **3000**). Stabil ohne Watch: `npx tsx server/src/index.ts` (siehe `AGENTS.md`).
- Client allein: typisch **3001**.

### 3.2 Content-Pfade
- Live-Content: **`game-data/`** (Root des Repos).
- Optional Snapshot: **`published-content/current/`** nach `pnpm run content:publish` / `POST /api/admin/content/publish-pack`; Server: `USE_PUBLISHED_CONTENT=1` oder `CONTENT_PACK_DIR`.

### 3.3 Persistenz-Spieler
- `PERSISTENCE_DRIVER`: `auto`, `firestore`, `file`, `spacetime` (Spacetime-Teil teils Stub mit File-Fallback — Details in `AGENTS.md` und Code).

### 3.4 GLB / Modelle
- Öffentliche Modelle: **`client/public/assets/models/`** → URLs **`/assets/models/...`**.
- Overrides: **`glb-links.json`** im Content-Root oder **`GLB_LINKS_STORE=spacetime`** (+ Env für Spacetime).
- Server-Fallbacks: `builtinModelFallbacks` / `ensureGlbUrl` damit nie „leere“ GLB-Pfade.

### 3.5 Admin-API (Auszug)
- Basis: **`/api/admin/content`**
- `GET /meta`, `GET /choices`, `GET /glb-scan`, `GET /glb-links`, `GET /glb-gallery-tree`
- `POST /glb-upload` (multipart `file`, optional `folder`)
- `POST /glb-links`, `DELETE /glb-links`
- Asset-Pools: `GET/POST/DELETE .../asset-pools/...`
- `POST /validate-preview`, `POST /publish-pack`
- Auth: `ADMIN_PANEL_TOKEN` / Header, oder Firebase Bearer + `ADMIN_UID_ALLOWLIST`; `CONTENT_ADMIN_READONLY=1` blockt Schreibzugriff.

### 3.6 Admin-UI
- **`/admin-content.html`** — Express liefert aus `client/dist` oder Fallback `client/public` (`ServerBootstrap`).

---

## 4. Wichtige Dateien (Einstiegspunkte)

| Bereich | Dateien |
|---------|---------|
| Server-Bootstrap | `server/src/core/ServerBootstrap.ts` |
| Game Loop | `server/src/core/WorldTick.ts` |
| Admin-Routen | `server/src/api/adminContentRoute.ts` |
| Admin-Auth | `server/src/middleware/adminAuthMiddleware.ts` |
| Content-Root | `server/src/modules/content/contentDataRoot.ts` |
| Validierung | `server/src/modules/content/validateContentCore.ts`, `server/src/tools/validateContent.ts` |
| GLB-Registry | `server/src/modules/asset-registry/GLBRegistry.ts` |
| GLB-Galerie/Upload-Logik | `server/src/modules/content/adminGlbGallery.ts`, `adminGlbPathCheck.ts` |
| Spacetime GLB | `server/src/modules/spacetime/*`, `spacetimedb-modules/areloria-glb/` |
| Client Babylon | `client/src/engine/babylon/BabylonAdapter.ts` |
| Client Boot / Auth | `client/src/clientBoot.ts`, `client/src/ui/hud.ts` |
| Agent-Anweisungen | `AGENTS.md`, `.env.example` |
| Projektstatus-Doku | `docs/PROJECT_STATUS_2026.md`, `docs/ROADMAP_TO_RELEASE.md` |
| Daten-Übersicht (Diagramm) | `docs/diagrams/data-stores-overview.mmd` (+ PDF) |

---

## 5. Letzte größere Ergänzung: GLB-Galerie & Upload

- **Zweck:** Admins sehen die **Ordnerstruktur** der Modelle und können **.glb/.gltf hochladen** ohne SSH.
- **Limit:** `MAX_ADMIN_GLB_UPLOAD_MB` (Default 50, Cap 120), sonst `MAX_GLB_SIZE_MB`.
- **Hinweis:** `/glb-scan` liefert für Dropdowns historisch nur **`.glb`**; `.gltf` erscheint in der **Galerie** und kann per „Übernehmen“ genutzt werden — optionaler Follow-up: `GLBRegistry.scanModels` um `.gltf` erweitern.

---

## 6. Qualitätssicherung

- **Tests:** `pnpm run test` (Vitest, viele Server-Tests).
- **Lint:** `pnpm run lint`.
- **E2E:** `pnpm run build` dann `pnpm run test:e2e` (Playwright; siehe `AGENTS.md`).

---

## 7. Bekannte Einschränkungen / Risiken

- SpacetimeDB-Persistenz für **Spielerdaten** ist nicht vollständig „live repliziert“; GLB-Links über Spacetime sind der ausgereiftere Pfad.
- Admin-Upload schreibt auf **lokales** `client/public/assets/models` — bei reinem **dist**-Deploy müssen gebaute Artefakte oder Mounts zum Repo-Pfad passen (wie bisher bei GLB-Pfaden).

---

## 8. Sinnvolle nächste Schritte (Vorschlag)

1. Optional: **`scanModels()`** um `.gltf` ergänzen für konsistente Dropdowns.  
2. No-Code-Roadmap aus dem großen Prompt: Content-Registry, Zonen-Editor, NPC/Quest-Editoren schrittweise — weiterhin **Runtime-first**, keine parallele „Schein-CMS“-Welt.  
3. Rechte/Rollen im Admin (nur Lesen vs. Publish vs. Asset-Upload) verfeinern, falls nötig.

---

## 9. Git / PR (Referenz)

- Entwicklung auf dem vom Cloud-Agent vorgegebenen Feature-Branch (z. B. `cursor/...`).  
- GLB-Galerie/Upload: PR **#277** (Stand bei Erstellung dieses Logbuchs) — nach Merge Branch-Status prüfen.

---

*Ende Logbuch-Eintrag. Ergänzungen bitte mit Datum unten anhängen.*

### Änderungsprotokoll (manuell pflegen)

- **2026-04-01:** Datei angelegt — Zusammenfassung aus Chat-Verlauf + letzter Stand GLB-Admin-Galerie/Upload.
