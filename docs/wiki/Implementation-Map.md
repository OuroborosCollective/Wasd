# Implementation Map

Tags: `implementation`, `code-map`, `agent-anchor`, `architecture`
Status: `living-index`

This page maps Areloria theory and wiki terms to actual repository paths.

Use it to keep [[ARE Logic Core|ARE-Logic-Core]] and shipped code aligned.

---

## Runtime core

| Wiki concept | Repository anchor | Status |
| --- | --- | --- |
| [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] | `server/src/core/WorldTick.ts` | active |
| WebSocket delivery | `server/src/networking/WebSocketServer.ts` | active |
| NPC system | `server/src/modules/npc/NPCSystem.ts` | active/evolving |
| Quest registry | `server/src/modules/quest/QuestRegistry.ts` | active/evolving |
| Inventory registry | `server/src/modules/inventory/ItemRegistry.ts` | active/evolving |

---

## ARE research anchors

| Wiki concept | Repository anchor | Status |
| --- | --- | --- |
| [[ARE Logic Core|ARE-Logic-Core]] | `docs/wiki/ARE-Logic-Core.md` | documented |
| [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] | `docs/wiki/ARE-Erdos-Attractor-Model.md` | research blueprint |
| Kappa grid | future `server/src/core/AREKernel.ts` | planned |
| Erdos network | future `server/src/core/AREErdosNetwork.ts` | planned |
| Self-healing | future `server/src/core/SelfHealEngine.ts` | planned/prototype |

---

## Client 2D / asset pipeline

| Wiki concept | Repository anchor | Status |
| --- | --- | --- |
| [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]] | `scripts/are-asset-forge.mjs` | active |
| Stitch frame enrichment | `scripts/enrich-stitch-atlas-frames.mjs` | active |
| Asset validation | `scripts/validate-client-2d-assets.mjs` | active |
| Weapon pool extraction | `scripts/extract-2d-weapon-pool.mjs` | active |
| Asset manifest | `apps/client-2d/public/2d-assets/manifest.json` | active |
| Deterministic renderer | `apps/client-2d/src/DeterministicWorldIsoApp.tsx` | active |
| HUD overlay | `apps/client-2d/src/ArelorianStitchHud.tsx` | active |
| Player vitals state | `apps/client-2d/src/live/playerVitalState.ts` | active |
| Pixi prop rendering | `apps/client-2d/src/stackedProps.ts` | active |

---

## CI / deployment / documentation

| Area | Repository anchor | Status |
| --- | --- | --- |
| Wiki sync | `.github/workflows/sync-wiki.yml` | active |
| Wiki sync script | `scripts/sync-wiki.mjs` | active |
| Client 2D smoke | `.github/workflows/client-2d-build-smoke.yml` | active |
| Production Docker | `Dockerfile.prod` | active |
| Deploy path | `/opt/areloria` | deployment convention |

---

## Agent edit rules

Before changing code, agents should answer:

1. Which wiki concept is this change tied to?
2. Which implementation anchor does it modify?
3. Is it `implemented`, `prototype`, `research` or `planned`?
4. Does it need a validator, smoke test or deploy check?
5. Should the wiki be updated in the same PR?

---

## See also

- [[Home]]
- [[Glossary]]
- [[Agent Index|Agent-Index]]
- [[Guard and Ops|Guard_and_Ops]]