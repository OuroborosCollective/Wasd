# Documentation index

Use this index to find current documentation quickly and avoid relying on historical reconstruction files.

## Start here (current)

| Document | Purpose |
|----------|---------|
| `README.md` | Repo overview, current stack, quick start |
| `AGENTS.md` | Cloud/dev agent operating guide |
| `docs/PROJECT_STATUS_2026.md` | Authoritative “what is live now” snapshot |
| `docs/ROADMAP_TO_RELEASE.md` | Release backlog and outstanding gaps |
| `docs/AUTONOMOUS_PLAYTESTER_MONITOR.md` | Playtester monitor architecture (WebRTC + viewer/publisher) |
| `DEPLOYMENT.md` | Production deployment flow (VPS + PM2 + CI) |
| `deploy/ENV_SETUP.md` | Minimal and safe `.env` setup flow |
| `deploy/.env.production.template` | Production env template |
| `docs/API_ADMIN_AND_CHAT.md` | Admin content and chat API summary |
| `tools/dgcc/README.md` | Design+Gameplay Consistency Contract (`pnpm run dgcc`) |

## Architecture and system references

| Document | Note |
|----------|------|
| `LOGIC_DOCUMENTATION.md` | Current systems and runtime modules (short architecture reference) |
| `docs/CLIENT_ARCHITECTURE.md` | Client layering and renderer structure |
| `docs/NETWORKING_MODEL.md` | WebSocket and synchronization model |
| `docs/MODULE_MANIFEST.md` | Curated module map for actively relevant systems |
| `docs/FILE_MAP.md` | Practical tree map for current repo layout |
| `game-data/AUTHORING_GUIDE.md` | Content authoring under `game-data/` |

## Legacy / historical docs

These files remain in the repository for history but are not source-of-truth for live behavior:

- `areloria_reconstruction_pack_*.md`
- `areloria_final_reconstruction_*.md`
- `SESSION_CONTEXT.md` and handover logs
- `docs/DEPLOYMENT_FIREBASE_AWS.md` (legacy concept note)
- `docs/FIREBASE_VPS_CHECKLIST.md` (legacy placeholder; Supabase is primary)

For implementation decisions, always prefer:

1. code in `server/src` + `client/src`,
2. `.env.example`,
3. the “current” documents listed above.
