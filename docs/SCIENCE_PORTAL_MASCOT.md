# Science Portal · Emily (Gemini) mascot

## Behaviour

- **Portal** builds the system prompt via `PortalNPCChatBridge`: `hazard_index`, `aggression_trend`, `VisualThemeState.mode`, and the **last 5** entries from `PortalWorldHistory` (quest echo stream).
- **Persona**
  - `fire_glitch`: short, staccato, technical (enforced in system text + lower `maxOutputTokens` + higher temperature).
  - `marina`: calm, analytical “Cyber-Zen”.
- **Server** exposes `POST /api/v1/science-mascot` (see `server/src/api/scienceMascotRoute.ts`) and calls **Google Gemini** with `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`. Optional `GEMINI_MODEL` (default `gemini-1.5-flash`).

## Configuration

1. **Wasd server** (default port `3000`):

   ```bash
   export GEMINI_API_KEY=your_key_here
   # optional: export GEMINI_MODEL=gemini-2.0-flash
   ```

2. **Portal** (Vite):

   ```bash
   export VITE_WASD_API_BASE=http://localhost:3000
   ```

   Without `VITE_WASD_API_BASE`, Emily runs in **local heuristic** mode (still world-aware, no network).

## NPCChatBridge (server)

`NPCChatBridge.injectContextIntoPrompt` now appends a digest of the last **5** `WorldHistory` events (`buildWorldHistoryDigest`). `getNPCCognitiveContext` fills `worldHistory` from the same source — aligned with the portal singleton pattern.

## Security note

Do **not** expose `GEMINI_API_KEY` in the browser. The portal only sends **already-built** system text + user message to your Wasd server; the key stays on the server.

## Vitest / Vite

Portal uses **Vite 5** with **`@vitejs/plugin-react` 4.x** (plugin v6 targets Vite 6 and breaks with `ERR_PACKAGE_PATH_NOT_EXPORTED` for `vite/internal`).  
`vite.config.ts` is merged with Vitest via `defineConfig` from `vitest/config`. CI runs `pnpm --filter @wasd/portal run test`.

## Stress demo

In **Echo Tracker**, **“10× combat stress”** queues ten combat echoes + rising hazard telemetry (~28 ms apart). Use **Emily → Stress-check** to ask for a one-line digest of the echo window; persona should follow `fire_glitch` vs `marina` from live `VisualThemeState`.
