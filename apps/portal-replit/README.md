# Areloria WASD — Replit Portal

A self-contained admin portal that connects directly to this monorepo.

## Features

- **Live GitHub sync** — shows latest commit from `main`, pushes fix notes back to the repo
- **Watchdog Dashboard** — polls the VPS watchdog circuit breaker (CLOSED / OPEN / HALF_OPEN) via SSH, streams recent events by severity
- **Player Monitor** — reads live player data from the game server via SSH every 20 seconds
- **VPS Control** — SSH ping shows hostname, OS, CPU, RAM, disk, Node/pnpm/git; one-click remote commands (clone repo, install deps, start watchdog, start server, git pull, etc.)

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4 (dark/emerald theme, Orbitron font)
- Express 5 API server with `ssh2` for VPS SSH

## Setup

The portal reads these environment variables / secrets:

| Key | Description |
|-----|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT with `repo` scope |
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username (default: `root`) |
| `VPS_PASSWORD` | SSH password (stored as secret) |

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/github/info` | Live repo + latest commit data |
| `POST /api/github/sync` | Push deployment fix notes to repo |
| `POST /api/github/push-portal` | Push this portal tool to `apps/portal-replit/` |
| `GET /api/vps/status` | VPS system info via SSH |
| `GET /api/vps/watchdog` | Watchdog circuit breaker state + event log |
| `GET /api/vps/players` | Live player data from game server |
| `GET /api/vps/commands` | Available remote command list |
| `POST /api/vps/exec` | Run a remote command on the VPS |

---
*OuroborosCollective — built on Replit · 2026-05-06*
