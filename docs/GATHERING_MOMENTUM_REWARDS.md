# Deterministic Gathering Momentum

This gameplay extension rewards repeated, same-skill resource gathering without random rolls or wall-clock state.

## Runtime source

- `currentTick` is the only timing source.
- Momentum is tracked per player inside `ResourceNodeStore`.
- A chain continues only when the same skill is gathered again within `600` ticks.
- First successful gather keeps base XP.
- Each continued same-skill gather adds `50` permille XP, capped at streak `5`.

## Player value

This gives gatherers a forward-moving loop: stay focused on woodcutting, mining, or fishing and the server grants a deterministic XP ramp. It makes resource routes more rewarding while keeping inventory rewards, depletion, respawn, and skill checks server-authoritative.

## ARE constraints

No random source. No wall-clock source. The result is derived from player id, skill id, successful gather order, and tick distance.
