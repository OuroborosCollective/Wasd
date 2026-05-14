# VPS deployment (`/opt/areloria`) — WASD monorepo

This repo is a **pnpm monorepo** (`apps/`, `packages/`, `projects/`, `server/`, `client/`, …). Production on a VPS uses **Docker Compose** (`docker-compose.yml`, service `arelorian-engine`).

## Security first

- If a root password was shared in chat, email, or tickets, **change it immediately**.
- Prefer a dedicated **`deploy` user** in the `docker` group, **SSH keys only**, `PasswordAuthentication no` in `sshd_config`. If you use **`root`** (common on small VPS), still use **SSH keys** for GitHub Actions — same setup, but put the public key in **`/root/.ssh/authorized_keys`**.
- **Never** commit VPS passwords or paste them into GitHub Secrets as `SSH_PASSWORD` long-term.

## One-time VPS bootstrap

On the server (as root or with sudo):

```bash
apt-get update && apt-get install -y git curl ca-certificates
# Install Docker (official docs) + ensure your user can run `docker ps`

mkdir -p /opt/areloria
cd /opt

# Read-only deploy key recommended: add public key in GitHub → Deploy keys
git clone https://github.com/<ORG>/<REPO>.git areloria
cd /opt/areloria

chmod +x scripts/deploy-vps-docker.sh
```

Create `.env` or configure Compose env as needed for your stack (see `docker-compose.yml`).

Smoke test:

```bash
bash scripts/deploy-vps-docker.sh
```

## GitHub Actions — automatic deploy on new code

Workflow: [`.github/workflows/vps-docker-deploy.yml`](../.github/workflows/vps-docker-deploy.yml)

It runs on **push to `main`** when files under the monorepo change (apps, server, Docker, lockfile, etc.), and on **manual** `workflow_dispatch`.

### GitHub secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP or DNS |
| `VPS_USER` | SSH user: e.g. **`root`** or `deploy` |
| `VPS_SSH_KEY` | **Private** key (full PEM / OpenSSH block) |
| `VPS_SSH_PORT` | Optional, default `22` |
| `VPS_DEPLOY_PATH` | Optional, default `/opt/areloria` |

Generate a **deploy-only** key pair on your laptop, put the **public** key in **`/root/.ssh/authorized_keys`** (if `VPS_USER` is `root`) or **`~/.ssh/authorized_keys`** for that user, then paste the **private** key into `VPS_SSH_KEY`.

## Local trigger with Python Paramiko (optional)

```bash
pip install paramiko
export VPS_HOST=your.vps.host
export VPS_USER=root
export SSH_PRIVATE_KEY="$(cat ~/.ssh/id_ed25519)"
export VPS_DEPLOY_PATH=/opt/areloria
python3 tools/deploy_vps_paramiko.py
```

This runs the same remote script as CI: `scripts/deploy-vps-docker.sh`.

## Related files

- `scripts/deploy-vps-docker.sh` — canonical VPS pull + `docker compose` rebuild
- `scripts/deploy-vps.sh` — alternative path (pnpm build + PM2); use if you intentionally run without Docker
- `deploy.sh` / root `docker-compose.yml` — engine + monitor images
