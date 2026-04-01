# Arelorian / Ouroboros — Start here

Structured browser MMORPG codebase: **Node + WebSocket server**, **Babylon.js (Vite) client**, **`game-data/`** JSON.

## Read first (current)

1. **`README.md`** — install, stack, links  
2. **`docs/PROJECT_STATUS_2026.md`** — **today’s behavior** (renderer, networking, deploy)  
3. **`docs/ROADMAP_TO_RELEASE.md`** — **what remains** to ship  
4. **`docs/MASTER_DESIGN_BIBLE.md`** — vision and pillars  
5. **`PROJECT_LOCK_RULES.md`** + **`final-lock/FINAL_TRUTH.md`** — constraints  
6. **`agent/AGENT_BUILD_INSTRUCTIONS.md`** — build order + **documentation rules**

## Project status

This is a **working foundation**, not a finished commercial MMO. Many modules exist under `server/src/modules/`; wiring, UI, and balance vary by system. Use **`docs/DOCUMENTATION_INDEX.md`** to distinguish **current** docs from **historical** reconstruction packs.

## Client renderer

**Primary: Babylon.js.** PlayCanvas code under `client/src/engine/playcanvas/` is **legacy fallback** only.
