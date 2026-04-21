# Client manifest

> **Note (2026):** This file described an idealized client tree. The **actual** layout is under `client/src/`. Primary renderer: **Babylon.js** (`engine/babylon/`, `main.ts`). See **`docs/PROJECT_STATUS_2026.md`** and **`docs/CLIENT_ARCHITECTURE.md`**.

## Key entrypoints (current)

- `client/src/main.ts` — bootstrap, core, socket, HUD  
- `client/src/engine/babylon/BabylonBoot.ts` — scene, camera, ground, skybox  
- `client/src/engine/babylon/BabylonAdapter.ts` — `IEngineBridge` implementation  
- `client/src/core/MMORPGClientCore.ts` — entities, events  
- `client/src/networking/websocketClient.ts` — WebSocket protocol  

## UI (partial list)

- `client/src/ui/hud.ts`, `inventory.ts`, `questLog.ts`, `mobileControls.ts`, …  

---

*The long file list that previously lived here is omitted to avoid drift; use your IDE or `find client/src -name '*.ts'` when needed.*
