# Client Architecture

The client renders the world with **Babylon.js**, holds local UI state, and synchronizes over **WebSocket** with the server.

## Layers (actual `client/src`)

- `main.ts` — minimal shell (canvas + `bootAreloriaClient`)  
- `clientBoot.ts` — engine + core + socket + HUD + game loop  
- `bootUi.ts` — bootstrap banner and **WebGL / context-lost** full-screen overlay  
- `engine/babylon/` — Babylon boot, adapter, ground/sky helpers, default `AssetRegistry` for GLB fallbacks  
- `engine/bridge/` — `IEngineBridge`, `EntityViewModel` (renderer-agnostic)  
- `core/` — `MMORPGClientCore`, event bus, entity view manager  
- `networking/` — `websocketClient.ts`  
- `ui/` — HUD, panels, mobile controls  

## Rules

- No authoritative simulation on the client  
- No persistence decisions on the client  
- Keep rendering separate from server politics and economy  
- See **`docs/PROJECT_STATUS_2026.md`** for message types and current behavior  