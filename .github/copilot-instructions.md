# Copilot Instructions for WASD / Areloria

Follow the repository-wide agent contract in:

```txt
docs/agents/ARELORIA_AGENT_SKILLBOOK.md
```

## Critical rules

- Build emergence through deterministic world laws, not hard behavioral cages.
- Keep one PR to one architecture layer.
- Preserve NPC autonomy unless the world state is final.
- Pure logic first, mutation only at explicit commit points.
- Surface world events before adding rewards, resonance, or visuals.
- Respect existing TypeScript import style and `.js` runtime suffixes.
- Add tests for new deterministic logic.

## Architecture order

```txt
pure module
adapter
NPCSystem commit point
WorldTick event surface
reward consequence
resonance echo
portal or client visualization
```

## Current guidance

After WorldTick surfaces an event batch, the next layer should consume it without mixing in UI or resonance side effects.
