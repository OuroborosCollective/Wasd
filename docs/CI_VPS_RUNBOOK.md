# CI, Deploy & VPS — Kurz-Runbook

## 1. GitHub Actions prüfen

Nach jedem Push auf `main`:

- **CI** (`.github/workflows/ci.yml`): Lint → Tests → Build → Modell-Pfad-Audit → Playwright E2E.
- **Deploy** (`.github/workflows/deploy.yml`): SSH auf den VPS → `deploy/deploy.sh` (nur Push + manuell `workflow_dispatch`, kein Cron).

Bei rotem Step: Log des fehlgeschlagenen Jobs öffnen; häufig E2E, Secrets oder VPS-Build (RAM/Timeout).

Lokal vor dem Push (ohne E2E):

```bash
pnpm run ci:verify
```

## 2. VPS nach Deploy

Auf dem Server (Repo-Root, z. B. `/opt/areloria`):

```bash
git fetch origin main && git reset --hard origin/main
chmod +x deploy/deploy.sh && ./deploy/deploy.sh
bash deploy/verify-vps-local.sh
```

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
