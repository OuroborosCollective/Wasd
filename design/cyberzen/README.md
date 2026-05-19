# Cyber-Zen Stitch Design System

This folder documents the visual design language supplied through the Stitch screen templates.

## Core DNA

- Matte black cockpit surfaces
- Marina cyan wireframes and neon strings
- Organic fire orange/red for hazard, scarcity, glitch and repair crisis
- Neon green for deterministic recovery and verified causality
- Gold/yellow for Oracle prophecy and Legendary loot resonance
- Violet/silver for Governance and Council states
- 10-Hz deterministic pulse: visual effects derive from tick phase, event severity, or hash-derived phase values.

## Primary UI Archetypes

| Template | Purpose | Runtime use |
|---|---|---|
| `screen-03-auth-root.png` / `screen-04-fire-ouroboros.png` | AUTH_ROOT deterministic gateway | Login / identity gate |
| `screen-10-science-hub.png` | SCIENCE_PORTAL_HUB | Portal root dashboard |
| `screen-01-chain-validator.png` / `screen-02-chain-validator-alt.png` / `screen-00-chain-validator.png` | CHAIN_STRING_VALIDATOR | Hash bridge / transfer panel |
| `screen-05-cyber-globe.png` | GLOBAL ASSET REPOSITORY / cyber globe | Right rail, asset/world status |
| `screen-06-fire-ouroboros.png` | Organic fire ouroboros | Crisis / repair / hazard state |
| `screen-07-are-logik.png` | ARE-LOGIK ouroboros | ARE logic / SDK / root state |
| `screen-08-mobile-system-dash.png` | Mobile System Dash | Responsive mobile status panels |

## Implementation Files

- `packages/shared/src/theme/ThemeEngine.ts` contains event-driven color state.
- `server/src/theme/serverThemeHazard.ts` mirrors server-side theme modes.
- `portal/public/cyberzen/stitch/*` stores the Stitch template images.
- `portal/src/design/cyberzenStitch.ts` maps theme states to Stitch-inspired templates.
- `portal/src/design/CyberZenStitchPanel.tsx` renders the live visual rail.
- `apps/client-2d/src/theme.css` holds the 2D Cyber-Zen CSS base.

## Planned Route Selector

After login the next visual layer should become:

```text
AUTH_ROOT → Route Selector → 3D Client / 2D Client / Science Portal
```

Future Stitch images for this selector should be added under `portal/public/cyberzen/stitch/selector-*` and registered in `portal/src/design/cyberzenStitch.ts`.

## Runtime Rule

Every dynamic glow must be deterministic:

```ts
phase = (tick % 10) / 9
pulse = Math.sin(tick * frequency + hashPhase)
```

No raw `Math.random()` or wall-clock-only animation may be used in core ARE logic. UI may animate, but state selection must come from 10-Hz tick phase, hash phase, or ThemeEngine event severity.
