# Documentation index

Use this map to avoid reading **obsolete** files as if they were current spec.

## Start here (current)

| Document | Purpose |
|----------|---------|
| **`README.md`** | Repo overview, install, architecture summary |
| **`AGENTS.md`** | Cursor / agent dev commands and constraints |
| **`docs/PROJECT_STATUS_2026.md`** | **What works today** (renderer, server, deploy) |
| **`docs/ROADMAP_TO_RELEASE.md`** | **What is left** until release; bible-aligned backlog |
| **`docs/MASTER_DESIGN_BIBLE.md`** | **Vision** and creative pillars (update rarely) |
| **`DEPLOYMENT.md`** | VPS / PM2 / GitHub Actions |
| **`docs/CI_VPS_RUNBOOK.md`** | CI prüfen, VPS verify, Secret `DEPLOY_VERIFY_BASE_URL` |
| **`docs/SPACETIME_PERSISTENCE_NEXT.md`** | SpacetimeDB-Persistenz — nächste Implementierungsschritte |
| **`docs/CONTENT_DRAFT_VS_LIVE.md`** | Entwurf vs. Live: game-data, published pack, GLB-Links |
| **`docs/FIREBASE_VPS_CHECKLIST.md`** | Firebase Admin + WS-Login + Client — VPS-Schritte und `/health` |
| **`deploy/ENV_SETUP.md`** | .env ohne SSH-Stress: SCP/SFTP, Vorlage, PM2 |
| **`deploy/.env.production.template`** | VPS `.env` Vorlage (nicht mit Secrets füllen ins Git) |
| **`docs/VITE_MCP_AND_VPS_SETUP.md`** | MCP + WebSocket + Nginx (Vite / Babylon client) |

## Architecture and systems

| Document | Note |
|----------|------|
| `ARCHITECTURE_OVERVIEW.md` | High-level diagrams — prefer Babylon for client stack |
| `ARCHITECTURE_NOTE.md` | Short architecture notes |
| `LOGIC_DOCUMENTATION.md` | Module-oriented logic reference — verify against code when editing |
| `docs/CLIENT_ARCHITECTURE.md` | Client layering rules |
| `docs/NETWORKING_MODEL.md` | WS / packets |
| `docs/MODULE_MANIFEST.md` | Module inventory |
| `docs/KNOWN_GAPS.md` | Short gap list — superseded in part by `ROADMAP_TO_RELEASE.md` |
| `game-data/AUTHORING_GUIDE.md` | Data authoring |

## Historical / pack files (do not use as sole source of truth)

Large reconstruction exports and old packs may still say **Three.js** or an older client stack as primary:

- `areloria_reconstruction_pack_*.md`
- `areloria_final_reconstruction_*.md`
- `SESSION_CONTEXT.md` (session log — read `PROJECT_STATUS_2026.md` first)

Treat these as **archaeology**, not the live stack description.

## Admin and integrations

- `admin-tools/README_ADMIN.md`
- `integrations/README_INTEGRATIONS.md`
- `agent/AGENT_BUILD_INSTRUCTIONS.md` — build order + **doc maintenance rules**

## Final-lock and agent rules

- `final-lock/FINAL_TRUTH.md`
- `final-lock/DO_NOT_SIMPLIFY.md`
- `PROJECT_LOCK_RULES.md`
- `agent/AI_AGENT_FAILSAFE_RULES.md`
- `.github/pull_request_template.md` — doc checklist for PRs

## Obsolete filenames

- **`docs/PLAYCANVAS_MCP_CURSOR_VPS_SETUP.md`** — removed; use **`docs/VITE_MCP_AND_VPS_SETUP.md`**
- **`docs/PLAYCANVAS_DIDI_SCRIPT_IMPORT.md`** — removed; scene flow is **server-driven** (`game-data/scenes/`).  
- **MCP:** tool `get_game_connection_profile` returns WebSocket + MCP URLs (replaces the old `get_playcanvas_connection_profile` name).
