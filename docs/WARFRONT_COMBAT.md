# Warfront combat module

## Server (10 Hz)

- **`WorldTick.tick`** drives perception sync → **`NPCSystem.tick`** → **`runWarfrontCombatTick`** (same 100 ms cadence as the world loop — no extra `setInterval` in `NPCSystem`).
- **`bootstrapWarfrontNpcs`** spawns `wf_*` bandits near `dummy_player` at `(500,500)` with tuned **aggression** traits.
- **`WarfrontCombatOrchestrator`** picks targets in range (NPC vs NPC, or vs dummy when aggression ≥ ~0.42), resolves damage via **`CombatService.handleSkillRequest`** (`ember_bolt` opener each tick for deterministic combo state), then applies **deterministic hit rolls** (`mulberry32` / `warfrontSeed` — no `Math.random`).
- **`WarfrontCombatTelemetry`** records every **hit** and **kill** into a ring buffer, **`WorldHistory.addEvent`**, **`serverWorldEventBus.emit('warfront_combat', …)`**, and bumps **theme hazard** on **kills** via `pushLiveTickerHazard`.

## API

- `GET /api/v1/warfront/feed?since=<seq>` — returns `{ events, lastSeq, hud }` for the compact HUD + portal ingestion (CORS `*` for dev).

## Portal

- **`WarfrontCombatHud`** (embedded in **Science Portal**): crosshair + threat radar; polls the feed when `VITE_WASD_API_BASE` is set and mirrors each new line into **`PortalWorldHistory.recordNpcCombatComplete`** so **Echo + Emily** stay live; pushes **`pushLiveTickerHazard`** on hits/kills from feed.

## Env

- Portal: `VITE_WASD_API_BASE` → Wasd server origin (same as Emily/Gemini proxy).
