# File map (current repository structure)

This map is intentionally high-level and matches the active monorepo layout.

## Root
- `README.md`
- `AGENTS.md`
- `DEPLOYMENT.md`
- `package.json`
- `.env.example`
- `docs/`
- `deploy/`
- `game-data/`
- `world-assets/`
- `scripts/`

## Server
- `server/src/core/` (bootstrap, world tick, persistence manager, health-facing runtime)
- `server/src/networking/` (WebSocket server)
- `server/src/api/` (admin content, vote, leaderboard, lore, questline, mcp routes)
- `server/src/modules/` (npc, quest, world, chat, playtester, economy, warfront, vote, etc.)
- `server/src/config/` (game/playtester/auth/tracing config)
- `server/src/tests/` (Vitest server tests)

## Client
- `client/src/` (main entry, babylon engine, ui, networking, auth config, monitor viewer/publisher)
- `client/public/` (static pages, admin-content, monitor pages, models)
- `client/vite.config.ts`

## Data and content
- `game-data/` (authoritative gameplay JSON: quests, npc, dialogue, scenes, world, spawns)
- `published-content/current/` (optional built content pack target)
- `world-assets/` (source 3D assets mirrored into client public paths by sync script)

## Operations
- `deploy/` (VPS env template, PM2/deploy scripts, setup docs)
- `.github/workflows/` (CI + deploy workflows)
- `integrations/` (external integration notes)
