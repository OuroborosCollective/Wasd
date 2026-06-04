# Arelorian Wiki: Obsidian Archive

Welcome to the **Obsidian Archive**, the official knowledge base for **Areloria / WASD**.

This wiki connects five layers of the project:

1. the [[Areloria Vision|Areloria-Vision]],
2. the [[ARE Logic Core|ARE-Logic-Core]],
3. the external [[Research Publications|Research-Publications]],
4. the deterministic runtime around [[WorldTick|WorldTick-and-10Hz-Simulation]],
5. the practical build, asset and deployment systems used by agents and maintainers.

> **Wiki rule:** Every concept page should link back to this page, the [[Glossary]], and at least one implementation page. Theory without a code anchor stays marked as research.

---

## Start here

| Area | Page | Purpose |
| --- | --- | --- |
| Vision | [[Areloria Vision|Areloria-Vision]] | High-level product and world goal |
| Research | [[Research Publications|Research-Publications]] | OSF publications and external research anchors |
| Theory | [[ARE Logic Core|ARE-Logic-Core]] | Five axioms, deterministic reality model |
| Math | [[ARE-Erdos Attractor Model|ARE-Erdos-Attractor-Model]] | Kappa, Erdős distance, attractor coefficient |
| Runtime | [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]] | Tick loop and server simulation rules |
| Code map | [[Implementation Map|Implementation-Map]] | Maps theory to files and modules |
| Assets | [[Asset Forge and 2D Pipeline|Asset-Forge-and-2D-Pipeline]] | Stitch, Pixi, atlas frames, Forge reports |
| Agents | [[Agent Index|Agent-Index]] | Rules for Copilot, Cursor, Jules, ChatGPT |
| Terms | [[Glossary]] | Canonical keywords and crosslinks |

---

## Core concepts

- [[Authentic Reality Emancipation|ARE-Logic-Core#authentic-reality-emancipation-are]]
- [[Research Publications|Research-Publications]]
- [[Kappa Coordinate System|ARE-Erdos-Attractor-Model#kappa-standardization]]
- [[10Hz deterministic tick|WorldTick-and-10Hz-Simulation]]
- [[Stateless Simulation|Determinism#stateless-simulation]]
- [[Erdos Attractor|ARE-Erdos-Attractor-Model]]
- [[Asset Forge|Asset-Forge-and-2D-Pipeline#are-asset-forge]]
- [[NPC Core|NPC_Core]]
- [[Economy and Matrix|Economy_and_Matrix]]
- [[Guard and Ops|Guard_and_Ops]]

---

## Current implementation anchors

- `server/src/core/WorldTick.ts` — canonical simulation heartbeat.
- `scripts/are-asset-forge.mjs` — deterministic asset metadata forge.
- `scripts/enrich-stitch-atlas-frames.mjs` — Stitch atlas frame preparation.
- `apps/client-2d/src/DeterministicWorldIsoApp.tsx` — PixiJS deterministic isometric renderer.
- `apps/client-2d/src/ArelorianStitchHud.tsx` — Game UI overlay with server-authoritative vitals.
- `apps/client-2d/src/live/playerVitalState.ts` — Server-authoritative HP/MP/Stamina/XP state.
- `apps/client-2d/src/stackedProps.ts` — Pixi prop rendering with frame cropping.
- `apps/client-2d/public/2d-assets/manifest.json` — runtime asset manifest.
- `.github/workflows/sync-wiki.yml` — syncs `docs/wiki/**` into the GitHub Wiki.

See [[Implementation Map|Implementation-Map]] for the full mapping.

---

## Wiki maintenance conventions

- Use `[[Page]]` or `[[Label|Page]]` links for wiki navigation.
- Use `Tags:` near the top of every page.
- Use `Status:` to separate **implemented**, **prototype**, **research**, and **planned**.
- Use `Implementation anchors` for file paths.
- Use `See also` at the bottom of every page.
- Use [[Research Publications|Research-Publications]] for OSF-backed external research anchors.

For exact term definitions, use [[Glossary]].