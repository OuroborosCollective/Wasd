# Areloria Vision

Tags: `vision`, `mmorpg`, `world-simulation`, `arelorian`, `ouroboros`
Status: `living-design`

Areloria is a browser-first MMORPG and simulation research platform. It combines a playable fantasy world with deterministic systems research under the umbrella of [[ARE Logic Core|ARE-Logic-Core]].

---

## Design intent

Areloria is built around three promises:

1. **A living world** — villages, cities, guilds, kingdoms, NPCs, economy and terrain are allowed to emerge from rules.
2. **A deterministic runtime** — every important state transition should be reproducible through [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]].
3. **A research engine** — the game is also a testbed for [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]], [[Stateless Simulation|Determinism#stateless-simulation]] and self-healing logic.

---

## Product pillars

| Pillar | Meaning | Linked system |
| --- | --- | --- |
| World | Procedural terrain, cities, dungeons, biomes | [[Systems Architecture|Systems_Architecture]] |
| Life | NPC memory, quests, economy, politics | [[NPC Core|NPC_Core]] |
| Determinism | 10Hz tick, kappa grid, replayability | [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] |
| Assets | 2.5D/3D asset ingestion, Forge metadata | [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]] |
| Ops | CI, VPS deploy, wiki sync, guard rails | [[Guard and Ops|Guard_and_Ops]] |

---

## Non-goals

Areloria should not become a random collection of features. Every feature must connect to at least one of:

- [[ARE Logic Core|ARE-Logic-Core]]
- [[Implementation Map|Implementation-Map]]
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]]
- [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]]

---

## See also

- [[Home]]
- [[Glossary]]
- [[ARE Logic Core|ARE-Logic-Core]]
- [[Implementation Map|Implementation-Map]]