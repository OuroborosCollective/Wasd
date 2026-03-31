# Arelorian / Ouroboros PlayCanvas Migration

Welcome to the Arelorian Browser-MMORPG project, now powered by the **PlayCanvas** engine and fully integrated with the original complex WASD server logic.

## Project Status
This repository has been fully migrated from Three.js to PlayCanvas. The server-side gameplay systems (Persistence, Combat, NPCs, Quests) have been re-integrated with the new PlayCanvas networking architecture (`entity_sync`).

## Prerequisites
- **Node.js** (v18+ recommended)
- **pnpm** (v10+ recommended)
- A **Firebase Project** (for Authentication and Firestore)

## Project Structure
- `/client`: PlayCanvas engine layer, bridge, and core client logic.
- `/server`: Autoritative game loop, WebSocket server, and complex game modules.
- `/game-data`: JSON configuration for the game world.
- `/world-assets`: 3D models and GLB files.

## Installation & Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Fill in your Firebase and database credentials.

### 3. Build and Start
```bash
pnpm run build
pnpm run start
```
For development: `pnpm run dev`

## Architecture
- **Client**: PlayCanvas (`client/src/engine/playcanvas/`) decoupled via a bridge (`client/src/engine/bridge/`).
- **Networking**: High-frequency entity synchronization via WebSockets.
- **Server**: Authoritative modules (`server/src/modules/`) integrated into the `WorldTick` loop.

## Cursor MCP + VPS setup
- Detailed setup guide: `docs/PLAYCANVAS_MCP_CURSOR_VPS_SETUP.md`
- Example Cursor config: `.cursor/mcp.json`

## Credits
Migration and System Re-integration by Jules.
