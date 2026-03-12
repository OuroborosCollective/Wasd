# Architecture Note

**Current Active Runtime:** Vite Client + Express Server
The project is currently running a custom Express server (in `/server`) and a Vite-based client (in `/client`). This setup is required to support the real-time WebSocket communication and custom game loop of the Arelorian MMORPG.

**Legacy Structure:** Next.js
The old Next.js root files (such as `/app`, `next.config.ts`, and `postcss.config.mjs`) are currently **inactive legacy structure**. They are bypassed by the current `package.json` workspace scripts.

**Future Cleanup:**
These legacy files have been left in place for now, but cleanup can happen later after the migration to the Vite + Express architecture is fully confirmed and stabilized.
