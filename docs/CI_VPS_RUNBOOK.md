# CI, Deploy & VPS — Kurz-Runbook

## 1. GitHub Actions prüfen

Nach jedem Push auf `main`:

- **CI** (`.github/workflows/ci.yml`): Lint → Tests → Build → Modell-Pfad-Audit → Playwright E2E.
- **Deploy** (`.github/workflows/main-pipeline.yml`): bei Push auf `main` (ohne reine Markdown/Docs-Änderungen) per SSH auf den VPS → `git fetch` / `reset --hard origin/main` → `bash deploy/update.sh` (install, Build inkl. Client-Assets, `pm2 restart areloria`, lokale Health-Checks).
- **Legacy / manuell** (`.github/workflows/deploy.yml`): nur noch `workflow_dispatch` — optionaler Pfad mit Azure-Blob-Upload und SCP des Server-`dist`; für den Standard-VPS-Flow nicht nötig.

Bei rotem Step: Log des fehlgeschlagenen Jobs öffnen; häufig E2E, Secrets oder VPS-Build (RAM/Timeout).

Lokal vor dem Push (ohne E2E):

```bash
pnpm run ci:verify
```

## 2. VPS nach Deploy

Auf dem Server (Repo-Root, z. B. `/opt/areloria`):

```bash
bash deploy/update.sh
```

(Wechselt nicht selbst den Git-Stand: nach manuellen Änderungen zuerst `git fetch origin main && git reset --hard origin/main`, dann `update.sh`. Der GitHub-Deploy-Workflow macht das Reset vor `update.sh`.)

## 3. Externe Health-Checks (optional)

Der Job `main-pipeline.yml` prüft nach dem Deploy per `curl` die **HTTP**-URL `http://<SSH_HOST>/` (Port 80 muss erreichbar sein, z. B. über Nginx → Node).

Ein separates Secret `DEPLOY_VERIFY_BASE_URL` für HTTPS-Checks ist im Workflow derzeit **nicht** angebunden; bei Bedarf kann die Health-Check-Step-Logik später darauf umgestellt werden.

GitHub **Repository secrets** für den VPS-SSH-Deploy:

| Secret | Bedeutung |
|--------|-----------|
| `SSH_HOST` | VPS-IP oder Hostname |
| `SSH_USER` | z. B. `root` |
| `SSH_PASSWORD` | Login-Passwort (besser langfristig durch SSH-Key ersetzen) |

## 4. SpacetimeDB (nächste Implementierung)

Siehe `docs/SPACETIME_PERSISTENCE_NEXT.md` und Modul `spacetimedb-modules/areloria-glb/`.

## 5. No-Code Admin

`admin-content.html`: nach Login u. a. Karte **Quests & Dialoge** — IDs per Dropdown und **Kopieren** (für Verknüpfungen im Spielinhalt).
