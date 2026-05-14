# CI, Deploy & VPS — Kurz-Runbook

## 1. GitHub Actions prüfen

Nach jedem Push auf `main`:

- **CI** (`.github/workflows/ci.yml`): Lint → Tests → Build → Modell-Pfad-Audit → Playwright E2E.
- **VPS full deploy** (`.github/workflows/vps-production-deploy.yml`): SSH auf den VPS → im Repo `git fetch` / `reset --hard origin/main` → `bash deploy/update.sh` (Client+Server-Build inkl. `VITE_*` aus `/opt/areloria/.env`, PM2-Restart). Läuft bei Push auf `main` (mit `paths-ignore` für reine Markdown/Docs) und per `workflow_dispatch`. Kein Azure-Schritt.
- **Deploy (Azure + Artefakt)** (`.github/workflows/deploy.yml`): Build, optional Azure Storage, SCP `server/dist`, PM2 — nur wenn die Azure-Secrets gesetzt sind.

Bei rotem Step: Log des fehlgeschlagenen Jobs öffnen; häufig E2E, Secrets oder VPS-Build (RAM/Timeout).

Lokal vor dem Push (ohne E2E):

```bash
pnpm run ci:verify
```

## 2. VPS manuell aktualisieren

Auf dem Server (Repo-Root, z. B. `/opt/areloria`):

```bash
bash deploy/update.sh
```

(`git pull`, `pnpm` install/build, `pm2 restart areloria`, lokaler Health-Check — siehe `deploy/update.sh`.)

Alternativ (nur Pull + Build ohne `.env`-Sourcing wie oben): `bash deploy/pull-and-deploy.sh`.

**Lokal per Paramiko (ohne Secrets im Repo):** `pip install paramiko`, dann z. B.:

```bash
export ARELORIA_SSH_HOST=dein-vps
export ARELORIA_SSH_KEY_PATH=$HOME/.ssh/id_ed25519
python3 deploy/run_deploy.py update
```

Weiteres SSH-Hilfsskript (OpenSSH/`sshpass`): `deploy/vps_connect.py` — Host per `--host` oder `ARELORIA_SSH_HOST`.

## 3. GitHub Actions Secrets (VPS-Workflow)

In **GitHub → Settings → Secrets → Actions** (nicht in `.env` auf dem VPS):

| Secret | Pflicht | Bedeutung |
|--------|---------|-----------|
| `SSH_HOST` | ja | VPS-Hostname oder IP |
| `SSH_USER` | ja | z. B. `root` |
| `SSH_PRIVATE_KEY` | empfohlen* | Private Key (Inhalt der Key-Datei) |
| `SSH_PASSWORD` | empfohlen* | Nur wenn kein Key; lieber Key + `ssh-copy-id` |
| `DEPLOY_PATH` | nein | Repo-Pfad auf dem VPS, Standard `/opt/areloria` wenn leer |
| `DEPLOY_VERIFY_BASE_URL` | nein | Öffentliche Basis-URL ohne Slash, z. B. `https://spiel.example.com` — danach `curl …/health` |

\* Mindestens eines von `SSH_PRIVATE_KEY` oder `SSH_PASSWORD` setzen.

`DEPLOYMENT.md` und `deploy/ENV_SETUP.md` beschreiben einmaliges VPS-Setup und `.env`.

## 4. SpacetimeDB (nächste Implementierung)

Siehe `docs/SPACETIME_PERSISTENCE_NEXT.md` und Modul `spacetimedb-modules/areloria-glb/`.

## 5. No-Code Admin

`admin-content.html`: nach Login u. a. Karte **Quests & Dialoge** — IDs per Dropdown und **Kopieren** (für Verknüpfungen im Spielinhalt).
