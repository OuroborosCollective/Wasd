# CI, Deploy & VPS — Kurz-Runbook

## 1. GitHub Actions prüfen

Nach jedem Push auf `main` (Code-Änderungen, nicht nur `docs/**` oder `*.md`):

- **CI** (falls vorhanden): Lint/Tests/Build in anderen Workflows.
- **VPS-Deploy** (`.github/workflows/main-pipeline.yml`): SSH auf den VPS → Repo unter `/opt/areloria` auf `origin/main` → `bash deploy/vps-prod-build.sh` (Wasd Server + Client, PM2 `areloria`).

Optional manuell: `.github/workflows/deploy.yml` ist nur noch **workflow_dispatch** (Legacy: Azure/SCP-Pipeline), kein Auto-Deploy auf jeden Push.

Bei rotem Step: Log des fehlgeschlagenen Jobs; häufig Secrets, RAM/Timeout beim Build, oder fehlendes `pm2`.

Lokal vor dem Push (ohne E2E):

```bash
pnpm run ci:verify
```

## 2. VPS nach Deploy

Auf dem Server (Repo-Root, z. B. `/opt/areloria`):

```bash
bash deploy/pull-and-deploy.sh
```

(Intern: `git fetch` + `reset --hard origin/main`, `./deploy/deploy.sh`, `verify-vps-local.sh`.)

## 3. Secret `DEPLOY_VERIFY_BASE_URL`

In **GitHub → Settings → Secrets → Actions** (nicht in `.env` auf dem VPS):

| Secret | Wert |
|--------|------|
| `DEPLOY_VERIFY_BASE_URL` | Öffentliche Basis-URL **ohne** Slash am Ende, z. B. `https://spiel.example.com` |

Wenn gesetzt, prüft der Deploy-Job nach dem SSH-Schritt per HTTPS: `/health`, `/`, `/gm/`.  
Ohne Secret: Deploy läuft durch, externe Checks werden übersprungen.

Weitere Secrets: `VPS_IP`, `VPS_USER`, `VPS_SSH_PASSWORD` — siehe `DEPLOYMENT.md`.

## 4. SpacetimeDB (nächste Implementierung)

Siehe `docs/SPACETIME_PERSISTENCE_NEXT.md` und Modul `spacetimedb-modules/areloria-glb/`.

## 5. No-Code Admin

`admin-content.html`: nach Login u. a. Karte **Quests & Dialoge** — IDs per Dropdown und **Kopieren** (für Verknüpfungen im Spielinhalt).
